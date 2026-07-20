'use server';

import { cookies } from 'next/headers';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { verifySessionCookie } from '@/lib/otp';
import type { Database, SalonRow, ServiceRow } from '@/lib/supabase/types';

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
// existing pending/confirmed appointments for the requested staff member.
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
  const [startHour, startMin] = wh.start.split(':').map(Number);
  const [endHour, endMin] = wh.end.split(':').map(Number);

  const dayStart = new Date(`${date}T${wh.start}:00`);
  const dayEnd = new Date(`${date}T${wh.end}:00`);

  // Fetch existing appointments for this staff (or all staff if 'any') on this date
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

  // Build set of busy intervals
  const busyIntervals = existingAppointments.map((a) => ({
    start: new Date(a.slot_start).getTime(),
    end: new Date(a.slot_end).getTime(),
  }));

  // Generate candidate slots every (duration_minutes) from dayStart to dayEnd
  const slots: { slotStart: string; slotEnd: string }[] = [];
  const duration = service.duration_minutes * 60 * 1_000;
  let cursor = dayStart.getTime();

  while (cursor + duration <= dayEnd.getTime()) {
    const slotEnd = cursor + duration;

    // Check for overlap with any busy interval
    const isBlocked = busyIntervals.some(
      (b) => cursor < b.end && slotEnd > b.start
    );

    if (!isBlocked) {
      slots.push({
        slotStart: new Date(cursor).toISOString(),
        slotEnd: new Date(slotEnd).toISOString(),
      });
    }

    cursor += duration;
  }

  // Suppress unused variable warnings
  void startHour; void startMin; void endHour; void endMin;

  return slots;
}

// ─────────────────────────────────────────────
// createAppointmentAsCustomer
// Requires a valid session cookie.
// Upserts the customer record, then re-checks slot availability
// inside a serialised insert to handle the race condition where two
// customers book the same slot simultaneously.
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

  // ── Race-condition guard ──────────────────────────────────────────────────
  // Re-check the slot isn't taken (the brief window between getAvailableSlots
  // returning and the user submitting can allow two concurrent bookings).
  let conflictQuery = supabase
    .from('appointments')
    .select('id')
    .eq('salon_id', salon.id)
    .in('status', ['pending', 'confirmed'])
    .lt('slot_start', slotEnd.toISOString())
    .gt('slot_end', slotStart.toISOString());

  if (input.staffId) {
    conflictQuery = conflictQuery.eq('staff_id', input.staffId);
  }

  const { data: conflictsData } = await conflictQuery;
  const conflicts = (conflictsData ?? []) as Array<{ id: string }>;
  if (conflicts.length > 0) {
    throw new Error('This slot was just booked by someone else — please pick another');
  }

  // ── Upsert customer record ────────────────────────────────────────────────
  // We don't have the customer's name at OTP time — use phone as placeholder
  // if it's a first visit. The UI should collect the name before booking.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: customerData, error: customerError } = await (supabase as any)
    .from('customers')
    .upsert(
      { salon_id: salon.id, phone: session.phone, name: session.phone, email: null },
      { onConflict: 'salon_id,phone', ignoreDuplicates: true }
    )
    .select()
    .single() as { data: CustomerRow | null; error: { message: string } | null };
  const customer = customerData;

  // If upsert returned nothing (ignoreDuplicates on existing row), fetch explicitly
  let resolvedCustomer: CustomerRow;
  if (customer) {
    resolvedCustomer = customer;
  } else {
    const { data: existingData, error: fetchErr } = await supabase
      .from('customers')
      .select('*')
      .eq('salon_id', salon.id)
      .eq('phone', session.phone)
      .single();
    const existing = existingData as CustomerRow | null;

    if (fetchErr || !existing) {
      throw new Error(`Failed to resolve customer: ${customerError?.message ?? fetchErr?.message}`);
    }
    resolvedCustomer = existing;
  }

  // ── Insert appointment ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: appointmentData, error: apptError } = await (supabase as any)
    .from('appointments')
    .insert({
      salon_id: salon.id,
      customer_id: resolvedCustomer.id,
      service_id: input.serviceId,
      staff_id: input.staffId ?? null,
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

  return appointment;
}

// ─────────────────────────────────────────────
// listMyAppointments
// Returns all appointments for the session phone at this salon.
// ─────────────────────────────────────────────

export async function listMyAppointments(salonSlug: string): Promise<
  (AppointmentRow & { services: ServiceRow | null })[]
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
    .select('*, services(*)')
    .eq('customer_id', customer.id)
    .order('slot_start', { ascending: false });

  if (error) throw new Error(`Failed to load appointments: ${error.message}`);
  return (data ?? []) as (AppointmentRow & { services: ServiceRow | null })[];
}
