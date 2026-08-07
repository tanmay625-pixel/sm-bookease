'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { verifySessionCookie } from '@/lib/otp';
import type { Database, SalonRow, ServiceRow, StaffRow } from '@/lib/supabase/types';

const SESSION_COOKIE_NAME = 'bookease_session';

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

export async function getAvailableSlots(
  salonSlug: string,
  serviceId: string,
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

  const { data: serviceData } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .eq('salon_id', salon.id)
    .single();
  const service = serviceData as Pick<ServiceRow, 'duration_minutes'> | null;

  if (!service) throw new Error('Service not found');

  // Determine which day of the week this date falls on
  const dateObj = new Date(`${date}T00:00:00`);
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayName = dayNames[dateObj.getDay()];

  if (!salon.working_days.includes(dayName)) {
    return []; // Salon is closed on this day
  }

  const wh = salon.working_hours as { start: string; end: string };
  const dayStart = new Date(`${date}T${wh.start}:00`);
  const dayEnd = new Date(`${date}T${wh.end}:00`);

  // Fetch all staff members for the salon
  const { data: staffData } = await supabase
    .from('staff')
    .select('id')
    .eq('salon_id', salon.id);
  const salonStaff = (staffData ?? []) as Pick<StaffRow, 'id'>[];

  // Fetch existing appointments on this date
  const startOfDay = `${date}T00:00:00+00:00`;
  const endOfDay = `${date}T23:59:59+00:00`;

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
  const duration = service.duration_minutes * 60 * 1_000;
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
      // Specific staff selected: blocked if that staff has an overlapping appointment
      isBlocked = existingAppointments.some(
        (a) => cursor < new Date(a.slot_end).getTime() && slotEnd > new Date(a.slot_start).getTime()
      );
    } else {
      // 'any' staff selected:
      if (salonStaff.length > 0) {
        // Find which staff members are busy during this slot
        const busyStaffIds = new Set<string>();
        for (const appt of existingAppointments) {
          const apptStart = new Date(appt.slot_start).getTime();
          const apptEnd = new Date(appt.slot_end).getTime();
          if (cursor < apptEnd && slotEnd > apptStart && appt.staff_id) {
            busyStaffIds.add(appt.staff_id);
          }
        }
        // Blocked only if all staff members are busy
        const availableStaffCount = salonStaff.filter((s) => !busyStaffIds.has(s.id)).length;
        if (availableStaffCount === 0) {
          isBlocked = true;
        }
      } else {
        // No staff configured in salon: check for any overlapping appointment
        isBlocked = existingAppointments.some(
          (a) => cursor < new Date(a.slot_end).getTime() && slotEnd > new Date(a.slot_start).getTime()
        );
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
// createAppointmentAsCustomer
// Requires a valid session cookie.
// Automatically assigns an available staff member if 'any' or omitted.
// ─────────────────────────────────────────────

type CreateBookingInput = {
  serviceId: string;
  staffId?: string;
  slotStart: string;  // ISO datetime
  notes?: string;
};

export async function createAppointmentAsCustomer(
  salonSlug: string,
  input: CreateBookingInput
): Promise<AppointmentRow> {
  const { session, salon, supabase } = await requireCustomerSession(salonSlug);

  // Resolve service to get duration
  const { data: serviceData } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', input.serviceId)
    .eq('salon_id', salon.id)
    .single();
  const service = serviceData as Pick<ServiceRow, 'duration_minutes'> | null;

  if (!service) throw new Error('Service not found');

  const slotStart = new Date(input.slotStart);
  const slotEnd = new Date(slotStart.getTime() + service.duration_minutes * 60 * 1_000);

  // Fetch all staff for this salon
  const { data: staffData } = await supabase
    .from('staff')
    .select('id, name')
    .eq('salon_id', salon.id)
    .order('created_at', { ascending: true });
  const salonStaff = (staffData ?? []) as Pick<StaffRow, 'id' | 'name'>[];

  // Fetch conflicting appointments in the requested slot
  const { data: conflictsData } = await supabase
    .from('appointments')
    .select('id, staff_id')
    .eq('salon_id', salon.id)
    .in('status', ['pending', 'confirmed'])
    .lt('slot_start', slotEnd.toISOString())
    .gt('slot_end', slotStart.toISOString());

  const conflicts = (conflictsData ?? []) as Array<{ id: string; staff_id: string | null }>;
  const busyStaffIds = new Set(conflicts.map((c) => c.staff_id).filter(Boolean) as string[]);

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
      service_id: input.serviceId,
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
  (AppointmentRow & { services: ServiceRow | null; staff: StaffRow | null })[]
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
    .select('*, services(*), staff(*)')
    .eq('customer_id', customer.id)
    .order('slot_start', { ascending: false });

  if (error) throw new Error(`Failed to load appointments: ${error.message}`);
  return (data ?? []) as (AppointmentRow & { services: ServiceRow | null; staff: StaffRow | null })[];
}
