'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { verifySessionCookie } from '@/lib/otp';
import type { Database, SalonRow, ServiceRow, StaffRow } from '@/lib/supabase/types';
import { toIST, istDateRange } from '@/lib/timezone';
import { findConflictingStaffIds } from '@/lib/availability';

const SESSION_COOKIE_NAME = 'bookmi_session';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type CustomerRow = Database['public']['Tables']['customers']['Row'];

// ─────────────────────────────────────────────
// Session helper — validate the customer session cookie
// ─────────────────────────────────────────────

async function requireCustomerSession(salonSlug: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) throw new Error('Not authenticated');

  const session = await verifySessionCookie(token);
  if (!session) throw new Error('Session expired — please sign in again');

  const supabase = createServiceSupabaseClient();

  // Verify the salonId in the token matches the requested slug
  const { data: salonData } = await supabase
    .from('salons')
    .select('id, working_hours, working_days')
    .eq('slug', salonSlug)
    .eq('id', session.salonId)
    .single();
  const salon = salonData as SalonRow | null;

  if (!salon) throw new Error('Session does not match this salon');

  return { session, salon, supabase };
}

// ─────────────────────────────────────────────
// getAvailableSlots
// Computes free slots for a given date based on working hours minus
// existing pending/confirmed appointments.
// When 'any' is selected, a slot is available if at least one staff member is free.
// When date is today, excludes slots whose start time has already passed.
// ─────────────────────────────────────────────

/**
 * @deprecated Use ScrollTimePicker + checkSlotAvailability instead.
 */
export async function getAvailableSlots(
  salonSlug: string,
  serviceIds: string[],
  staffIdOrAny: string, // UUID or 'any'
  date: string           // YYYY-MM-DD
): Promise<{ slotStart: string; slotEnd: string }[]> {
  const supabase = createServiceSupabaseClient();

  // Get salon working hours and service duration (public reads — no session required)
  const { data: salonData } = await supabase
    .from('salons')
    .select('id, working_hours, working_days')
    .eq('slug', salonSlug)
    .single();
  const salon = salonData as SalonRow | null;

  if (!salon) throw new Error('Salon not found');

  if (!serviceIds || serviceIds.length === 0) return [];

  const { data: servicesData } = await supabase
    .from('services')
    .select('duration_minutes')
    .in('id', serviceIds)
    .eq('salon_id', salon.id);
  const services = servicesData as Pick<ServiceRow, 'duration_minutes'>[] | null;

  if (!services || services.length !== serviceIds.length) throw new Error('One or more services not found');

  const totalDurationMinutes = services.reduce((sum, s) => sum + s.duration_minutes, 0);

  // Determine which day of the week this date falls on
  const dateObj = new Date(`${date}T00:00:00`);
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayName = dayNames[dateObj.getDay()];

  if (!salon.working_days.includes(dayName)) {
    return []; // Salon is closed on this day
  }

  const wh = salon.working_hours as { start: string; end: string };
  const dayStart = toIST(date, wh.start);
  const dayEnd = toIST(date, wh.end);

  // Fetch all staff members for the salon
  const { data: staffData } = await supabase
    .from('staff')
    .select('id')
    .eq('salon_id', salon.id);
  const salonStaff = (staffData ?? []) as Pick<StaffRow, 'id'>[];

  // Fetch existing appointments on this date using the new timezone utility
  const { startOfDay, endOfDay } = istDateRange(date);

  let apptQuery = supabase
    .from('appointments')
    .select('slot_start, slot_end, staff_id')
    .eq('salon_id', salon.id)
    .in('status', ['pending', 'confirmed'])
    .gte('slot_start', startOfDay)
    .lte('slot_start', endOfDay);

  if (staffIdOrAny !== 'any') {
    apptQuery = apptQuery.eq('staff_id', staffIdOrAny);
  }

  const { data: apptData } = await apptQuery;
  const existingAppointments = (apptData ?? []) as Array<{
    slot_start: string;
    slot_end: string;
    staff_id: string | null;
  }>;

  // Generate candidate slots every (duration_minutes) from dayStart to dayEnd
  const slots: { slotStart: string; slotEnd: string }[] = [];
  const duration = totalDurationMinutes * 60 * 1_000;
  let cursor = dayStart.getTime();
  const nowTime = Date.now();

  while (cursor + duration <= dayEnd.getTime()) {
    const slotEnd = cursor + duration;

    // BUG 3 Fix: If slot start time is already in the past (e.g. today at 1pm, 9am is past), skip it
    if (cursor <= nowTime) {
      cursor += duration;
      continue;
    }

    // Check availability
    let isBlocked = false;

    if (staffIdOrAny !== 'any') {
      const busyStaff = findConflictingStaffIds(existingAppointments, cursor, slotEnd);
      if (busyStaff.has(staffIdOrAny)) {
        isBlocked = true;
      }
    } else {
      const busyStaff = findConflictingStaffIds(existingAppointments, cursor, slotEnd);
      if (salonStaff.length > 0) {
        const availableStaffCount = salonStaff.filter((s) => !busyStaff.has(s.id)).length;
        if (availableStaffCount === 0) {
          isBlocked = true;
        }
      } else {
        if (busyStaff.size > 0 || existingAppointments.some(a => new Date(a.slot_start).getTime() < slotEnd && new Date(a.slot_end).getTime() > cursor)) {
          isBlocked = true;
        }
      }
    }

    if (!isBlocked) {
      slots.push({
        slotStart: new Date(cursor).toISOString(),
        slotEnd: new Date(slotEnd).toISOString(),
      });
    }

    cursor += duration;
  }

  return slots;
}

// ─────────────────────────────────────────────
// checkSlotAvailability
// Validates a specific time slot against working hours, past time, and existing appointments.
// ─────────────────────────────────────────────
export async function checkSlotAvailability(
  salonSlug: string,
  staffIdOrAny: string,       // UUID or 'any'
  date: string,               // YYYY-MM-DD
  startTime: string,          // "HH:MM" in IST
  durationMinutes: number,
  excludeAppointmentId?: string
): Promise<{ available: boolean; conflictReason?: string }> {
  const supabase = createServiceSupabaseClient();

  const { data: salonData } = await supabase
    .from('salons')
    .select('id, working_hours, working_days')
    .eq('slug', salonSlug)
    .single();
  const salon = salonData as SalonRow | null;

  if (!salon) throw new Error('Salon not found');

  const dateObj = new Date(`${date}T00:00:00`);
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayName = dayNames[dateObj.getDay()];

  if (!salon.working_days.includes(dayName)) {
    return { available: false, conflictReason: 'Salon is closed on this day' };
  }

  const wh = salon.working_hours as { start: string; end: string };
  const dayStart = toIST(date, wh.start);
  const dayEnd = toIST(date, wh.end);

  const slotStart = toIST(date, startTime);
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1_000);

  if (slotStart < dayStart || slotEnd > dayEnd) {
    return { available: false, conflictReason: `Selected time falls outside working hours (${wh.start} – ${wh.end})` };
  }

  if (slotStart.getTime() <= Date.now()) {
    return { available: false, conflictReason: 'This time has already passed' };
  }

  const { startOfDay, endOfDay } = istDateRange(date);

  let apptQuery = supabase
    .from('appointments')
    .select('id, slot_start, slot_end, staff_id')
    .eq('salon_id', salon.id)
    .in('status', ['pending', 'confirmed'])
    .gte('slot_start', startOfDay)
    .lte('slot_start', endOfDay);

  if (excludeAppointmentId) {
    apptQuery = apptQuery.neq('id', excludeAppointmentId);
  }

  const { data: apptData } = await apptQuery;
  const existingAppointments = (apptData ?? []) as Array<{
    id: string;
    slot_start: string;
    slot_end: string;
    staff_id: string | null;
  }>;

  const busyStaff = findConflictingStaffIds(existingAppointments, slotStart.getTime(), slotEnd.getTime());

  if (staffIdOrAny !== 'any') {
    if (busyStaff.has(staffIdOrAny)) {
      return { available: false, conflictReason: 'Staff member is unavailable at this time' };
    }
  } else {
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('salon_id', salon.id);
    const salonStaff = (staffData ?? []) as Pick<StaffRow, 'id'>[];

    if (salonStaff.length > 0) {
      const availableStaffCount = salonStaff.filter((s) => !busyStaff.has(s.id)).length;
      if (availableStaffCount === 0) {
        return { available: false, conflictReason: 'All staff members are booked at this time' };
      }
    } else {
      if (busyStaff.size > 0 || existingAppointments.some(a => new Date(a.slot_start).getTime() < slotEnd.getTime() && new Date(a.slot_end).getTime() > slotStart.getTime())) {
         return { available: false, conflictReason: 'Slot is booked at this time' };
      }
    }
  }

  return { available: true };
}

// ─────────────────────────────────────────────
// createAppointmentAsCustomer
// Requires a valid session cookie.
// Automatically assigns an available staff member if 'any' or omitted.
// ─────────────────────────────────────────────

type CreateBookingInput = {
  serviceIds: string[];
  staffId?: string;
  slotStart: string;  // ISO datetime
  notes?: string;
};

export async function createAppointmentAsCustomer(
  salonSlug: string,
  input: CreateBookingInput
): Promise<AppointmentRow> {
  const { session, salon, supabase } = await requireCustomerSession(salonSlug);

  if (!input.serviceIds || input.serviceIds.length === 0) throw new Error('No services selected');

  // Resolve services to get duration
  const { data: servicesData } = await supabase
    .from('services')
    .select('duration_minutes')
    .in('id', input.serviceIds)
    .eq('salon_id', salon.id);
  const services = servicesData as Pick<ServiceRow, 'duration_minutes'>[] | null;

  if (!services || services.length !== input.serviceIds.length) throw new Error('One or more services not found');

  const totalDurationMinutes = services.reduce((sum, s) => sum + s.duration_minutes, 0);

  const slotStart = new Date(input.slotStart);
  const slotEnd = new Date(slotStart.getTime() + totalDurationMinutes * 60 * 1_000);

  // Fetch all staff for this salon
  const { data: staffData } = await supabase
    .from('staff')
    .select('id, name')
    .eq('salon_id', salon.id)
    .order('created_at', { ascending: true });
  const salonStaff = (staffData ?? []) as Pick<StaffRow, 'id' | 'name'>[];

  // Fetch conflicting appointments in the requested slot
  // CRITICAL: select slot_start and slot_end — findConflictingStaffIds needs them
  const { data: conflictsData } = await supabase
    .from('appointments')
    .select('id, staff_id, slot_start, slot_end')
    .eq('salon_id', salon.id)
    .in('status', ['pending', 'confirmed'])
    .lt('slot_start', slotEnd.toISOString())
    .gt('slot_end', slotStart.toISOString());

  const conflicts = (conflictsData ?? []) as Array<{ id: string; staff_id: string | null; slot_start: string; slot_end: string }>;
  const busyStaffIds = findConflictingStaffIds(
    conflicts,
    slotStart.getTime(),
    slotEnd.getTime()
  );

  let assignedStaffId: string | null = null;

  if (input.staffId && input.staffId !== 'any') {
    // Customer picked a specific staff member
    if (busyStaffIds.has(input.staffId)) {
      throw new Error('This staff member was just booked for this slot — please pick another slot or staff member');
    }
    assignedStaffId = input.staffId;
  } else {
    // Customer picked 'any' or omitted staff — assign the first available staff member
    if (salonStaff.length > 0) {
      const freeStaff = salonStaff.find((s) => !busyStaffIds.has(s.id));
      if (!freeStaff) {
        throw new Error('This slot was just booked by someone else — please pick another slot');
      }
      assignedStaffId = freeStaff.id;
    } else {
      // No staff in database for this salon (e.g. single operator without staff records)
      if (conflicts.length > 0) {
        throw new Error('This slot was just booked by someone else — please pick another slot');
      }
      assignedStaffId = null;
    }
  }

  // ── Resolve / Upsert customer record ──────────────────────────────────────
  // Fetch existing customer first to preserve name if already set
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('*')
    .eq('salon_id', salon.id)
    .eq('phone', session.phone)
    .single();

  let resolvedCustomer: CustomerRow;

  if (existingCustomer) {
    resolvedCustomer = existingCustomer as CustomerRow;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newCustomer, error: insertErr } = await (supabase as any)
      .from('customers')
      .insert({
        salon_id: salon.id,
        phone: session.phone,
        name: session.phone,
        email: null,
      })
      .select()
      .single() as { data: CustomerRow | null; error: { message: string } | null };

    if (insertErr || !newCustomer) {
      throw new Error(`Failed to create customer: ${insertErr?.message ?? 'unknown'}`);
    }
    resolvedCustomer = newCustomer;
  }

  // ── Insert appointment ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: appointmentData, error: apptError } = await (supabase as any)
    .from('appointments')
    .insert({
      salon_id: salon.id,
      customer_id: resolvedCustomer.id,
      service_id: input.serviceIds[0], // primary service for backward compat
      staff_id: assignedStaffId,
      slot_start: slotStart.toISOString(),
      slot_end: slotEnd.toISOString(),
      status: 'pending',
      notes: input.notes ?? null,
      created_by: 'customer',
    })
    .select()
    .single() as { data: AppointmentRow | null; error: { message: string } | null };
  const appointment = appointmentData;

  if (apptError || !appointment) {
    throw new Error(`Failed to create appointment: ${apptError?.message ?? 'unknown'}`);
  }

  // Insert into junction table
  const appointmentServices = input.serviceIds.map((serviceId) => ({
    appointment_id: appointment.id,
    service_id: serviceId,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: junctionError } = await (supabase as any)
    .from('appointment_services')
    .insert(appointmentServices);

  if (junctionError) {
    console.error('Failed to insert appointment_services:', junctionError);
    // Best effort, we don't throw to avoid failing the appointment if junction fails,
    // though in a real app we'd probably use an RPC/transaction.
  }

  revalidatePath(`/${salonSlug}/history`, 'page');
  return appointment;
}

// ─────────────────────────────────────────────
// cancelOwnAppointment
// Allows a signed-in customer to cancel an upcoming appointment that belongs to their phone number.
// ─────────────────────────────────────────────

export async function cancelOwnAppointment(
  salonSlug: string,
  appointmentId: string
): Promise<{ ok: boolean; error?: string }> {
  const { session, salon, supabase } = await requireCustomerSession(salonSlug);

  // Fetch the appointment and joined customer to verify ownership
  const { data: apptData, error: fetchErr } = await supabase
    .from('appointments')
    .select('*, customers(*)')
    .eq('id', appointmentId)
    .eq('salon_id', salon.id)
    .single();

  const appointment = apptData as (AppointmentRow & { customers: CustomerRow | null }) | null;

  if (fetchErr || !appointment) {
    return { ok: false, error: 'Appointment not found' };
  }

  // Verify the customer's phone matches the session
  if (appointment.customers?.phone !== session.phone) {
    return { ok: false, error: 'Unauthorized to cancel this appointment' };
  }

  if (appointment.status === 'cancelled') {
    return { ok: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (supabase as any)
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId);

  if (updateErr) {
    return { ok: false, error: `Failed to cancel appointment: ${updateErr.message}` };
  }

  revalidatePath(`/${salonSlug}/history`, 'page');
  revalidatePath(`/${salonSlug}/appointments`, 'page');
  revalidatePath(`/${salonSlug}/dashboard`, 'page');

  return { ok: true };
}

// ─────────────────────────────────────────────
// listMyAppointments
// Returns all appointments for the session phone at this salon.
// ─────────────────────────────────────────────

export async function listMyAppointments(salonSlug: string): Promise<
  (AppointmentRow & { 
    services: ServiceRow | null; 
    staff: StaffRow | null;
    appointment_services?: { services: ServiceRow | null }[] 
  })[]
> {
  const { session, salon, supabase } = await requireCustomerSession(salonSlug);

  // Find customer record for this phone
  const { data: customerData } = await supabase
    .from('customers')
    .select('id')
    .eq('salon_id', salon.id)
    .eq('phone', session.phone)
    .single();
  const customer = customerData as { id: string } | null;

  if (!customer) return [];

  const { data, error } = await supabase
    .from('appointments')
    .select('*, services(*), staff(*), appointment_services(services(*))')
    .eq('customer_id', customer.id)
    .order('slot_start', { ascending: false });

  if (error) throw new Error(`Failed to load appointments: ${error.message}`);
  return (data ?? []) as any[];
}
