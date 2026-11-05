'use server';

import { revalidatePath } from 'next/cache';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { requireStaffSession } from '@/lib/staff-session';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { findConflictingStaffIds } from '@/lib/availability';
import type { CustomerRow, ServiceRow, StaffRow } from '@/lib/supabase/types';
import type { AppointmentRow } from '@/lib/supabase/types';

export type StaffAppointmentWithRelations = AppointmentRow & {
  customers: CustomerRow | null;
  services: ServiceRow | null;
  staff: StaffRow | null;
  appointment_services?: { services: ServiceRow | null }[];
};

// ─────────────────────────────────────────────
// Auth helper: requires a valid staff session
// for the given slug and returns it.
// ─────────────────────────────────────────────

async function requireStaffAuth(slug: string) {
  return await requireStaffSession(slug);
}

// ─────────────────────────────────────────────
// listStaffAppointments
// STRICT: only returns appointments assigned to this staff member.
// ─────────────────────────────────────────────

type AppointmentFilters = {
  dateFrom?: string;
  dateTo?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  search?: string;
};

export async function listStaffAppointments(
  slug: string,
  filters: AppointmentFilters = {}
): Promise<StaffAppointmentWithRelations[]> {
  const session = await requireStaffAuth(slug);
  const supabase = createServiceSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('appointments')
    .select('*, customers(*), services(*), staff(*), appointment_services(services(*))')
    .eq('salon_id', session.salonId)
    .eq('staff_id', session.staffId)   // STRICT: only own appointments
    .order('slot_start', { ascending: true });

  if (filters.dateFrom) query = query.gte('slot_start', filters.dateFrom);
  if (filters.dateTo) query = query.lte('slot_start', filters.dateTo);
  if (filters.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list appointments: ${error.message}`);

  let results = (data ?? []) as StaffAppointmentWithRelations[];

  if (filters.search) {
    const term = filters.search.toLowerCase();
    results = results.filter(
      (a) =>
        a.customers?.name?.toLowerCase().includes(term) ||
        a.customers?.phone?.includes(term)
    );
  }

  return results;
}

// ─────────────────────────────────────────────
// createStaffAppointment
// Forces staff_id = session.staffId — staff cannot book for other staff.
// ─────────────────────────────────────────────

type CreateStaffAppointmentInput = {
  customerId: string;
  serviceIds: string[];
  slotStart: string;
  slotEnd: string;
  notes?: string;
};

export async function createStaffAppointment(
  slug: string,
  input: CreateStaffAppointmentInput
): Promise<AppointmentRow> {
  const session = await requireStaffAuth(slug);
  const supabase = createServiceSupabaseClient();

  // Guard: reject past slots
  if (new Date(input.slotStart).getTime() <= Date.now()) {
    throw new Error('Selected appointment time is in the past.');
  }

  // Conflict check for this staff member's slot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conflictsData } = await (supabase as any)
    .from('appointments')
    .select('id, staff_id, slot_start, slot_end')
    .eq('salon_id', session.salonId)
    .eq('staff_id', session.staffId)
    .in('status', ['pending', 'confirmed'])
    .lt('slot_start', input.slotEnd)
    .gt('slot_end', input.slotStart);

  const conflicts = (conflictsData ?? []) as Array<{ id: string; staff_id: string | null; slot_start: string; slot_end: string }>;
  const busyStaffIds = findConflictingStaffIds(
    conflicts,
    new Date(input.slotStart).getTime(),
    new Date(input.slotEnd).getTime()
  );

  if (busyStaffIds.has(session.staffId)) {
    throw new Error('You already have an appointment at this time — please choose a different time.');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: apptData, error } = await (supabase as any)
    .from('appointments')
    .insert({
      salon_id: session.salonId,
      customer_id: input.customerId,
      service_id: input.serviceIds[0],
      slot_start: input.slotStart,
      slot_end: input.slotEnd,
      staff_id: session.staffId,  // LOCKED to current staff
      notes: input.notes ?? null,
      status: 'pending',
      created_by: `staff:${session.staffId}`,
    })
    .select()
    .single();

  if (error || !apptData) {
    throw new Error(`Failed to create appointment: ${error?.message ?? 'unknown'}`);
  }

  // Insert junction table
  const appointmentServices = input.serviceIds.map((serviceId) => ({
    appointment_id: apptData.id,
    service_id: serviceId,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('appointment_services').insert(appointmentServices);

  revalidatePath('/[slug]/staff/appointments', 'page');
  revalidatePath('/[slug]/staff/dashboard', 'page');
  return apptData as AppointmentRow;
}

// ─────────────────────────────────────────────
// updateStaffAppointmentStatus
// Staff can only update their own appointments.
// Triggers WhatsApp confirmation on 'confirmed'.
// ─────────────────────────────────────────────

export async function updateStaffAppointmentStatus(
  slug: string,
  appointmentId: string,
  status: 'pending' | 'confirmed' | 'cancelled'
): Promise<void> {
  const session = await requireStaffAuth(slug);
  const supabase = createServiceSupabaseClient();

  // Fetch appointment and verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingData } = await (supabase as any)
    .from('appointments')
    .select('*, customers(*), services(*)')
    .eq('id', appointmentId)
    .eq('staff_id', session.staffId)       // STRICT: own appointments only
    .eq('salon_id', session.salonId)
    .single();

  const existing = existingData as (AppointmentRow & {
    customers: CustomerRow | null;
    services: { name: string } | null;
  }) | null;

  if (!existing) throw new Error('Appointment not found or not assigned to you.');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId);

  if (error) throw new Error(`Failed to update appointment status: ${error.message}`);

  // Send WhatsApp confirmation
  if (status === 'confirmed') {
    const customer = existing.customers as CustomerRow | null;
    if (customer?.phone) {
      await sendWhatsAppMessage(
        customer.phone,
        'appointment_confirmed',
        'en',
        [
          customer.name,
          new Date(existing.slot_start).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        ],
        existing.salon_id
      ).catch((err) => {
        console.error('[updateStaffAppointmentStatus] WhatsApp send failed:', err);
      });
    }
  }

  revalidatePath('/[slug]/staff/appointments', 'page');
  revalidatePath('/[slug]/staff/dashboard', 'page');
}

// ─────────────────────────────────────────────
// updateStaffAppointmentDetails
// Staff can only edit their own future appointments.
// ─────────────────────────────────────────────

type UpdateStaffAppointmentInput = {
  appointmentId: string;
  serviceIds?: string[];
  slotStart?: string;
  slotEnd?: string;
  notes?: string | null;
};

export async function updateStaffAppointmentDetails(
  slug: string,
  input: UpdateStaffAppointmentInput
): Promise<StaffAppointmentWithRelations> {
  const session = await requireStaffAuth(slug);
  const supabase = createServiceSupabaseClient();

  // Fetch and verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingData, error: fetchErr } = await (supabase as any)
    .from('appointments')
    .select('id, salon_id, service_id, status, slot_start, slot_end, staff_id')
    .eq('id', input.appointmentId)
    .eq('staff_id', session.staffId)
    .eq('salon_id', session.salonId)
    .single();

  const existing = existingData as Pick<AppointmentRow, 'id' | 'salon_id' | 'service_id' | 'status' | 'slot_start' | 'slot_end' | 'staff_id'> | null;
  if (fetchErr || !existing) throw new Error('Appointment not found or not assigned to you.');

  // Cannot edit past appointments
  if (new Date(existing.slot_start).getTime() <= Date.now()) {
    throw new Error('Cannot edit past appointments.');
  }

  // Cannot reschedule to the past
  if (input.slotStart && new Date(input.slotStart).getTime() <= Date.now()) {
    throw new Error('Cannot reschedule an appointment to a time in the past.');
  }

  const slotStart = input.slotStart || existing.slot_start;
  const slotEnd = input.slotEnd || existing.slot_end;

  // Conflict check for new slot (excluding this appointment)
  if (input.slotStart) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conflictsData } = await (supabase as any)
      .from('appointments')
      .select('id, staff_id, slot_start, slot_end')
      .eq('salon_id', session.salonId)
      .eq('staff_id', session.staffId)
      .neq('id', input.appointmentId)
      .in('status', ['pending', 'confirmed'])
      .lt('slot_start', slotEnd)
      .gt('slot_end', slotStart);

    const conflicts = (conflictsData ?? []) as Array<{ id: string; staff_id: string | null; slot_start: string; slot_end: string }>;
    const busyStaffIds = findConflictingStaffIds(
      conflicts,
      new Date(slotStart).getTime(),
      new Date(slotEnd).getTime()
    );

    if (busyStaffIds.has(session.staffId)) {
      throw new Error('You already have an appointment at this time — please choose a different time.');
    }
  }

  // Build updates
  const updates: Partial<AppointmentRow> = {};
  if (input.serviceIds && input.serviceIds.length > 0) updates.service_id = input.serviceIds[0];
  if (input.slotStart) updates.slot_start = input.slotStart;
  if (input.slotEnd) updates.slot_end = input.slotEnd;
  if (input.notes !== undefined) updates.notes = input.notes;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('appointments')
    .update(updates)
    .eq('id', input.appointmentId);

  if (updateError) throw new Error(`Failed to update appointment: ${updateError.message}`);

  // Update junction table if services changed
  if (input.serviceIds && input.serviceIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('appointment_services').delete().eq('appointment_id', input.appointmentId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('appointment_services').insert(
      input.serviceIds.map((sid) => ({ appointment_id: input.appointmentId, service_id: sid }))
    );
  }

  // Fetch updated record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedData, error: fetchUpdatedErr } = await (supabase as any)
    .from('appointments')
    .select('*, customers(*), services(*), staff(*), appointment_services(services(*))')
    .eq('id', input.appointmentId)
    .single();

  if (fetchUpdatedErr || !updatedData) {
    throw new Error('Failed to fetch updated appointment.');
  }

  revalidatePath('/[slug]/staff/appointments', 'page');
  revalidatePath('/[slug]/staff/dashboard', 'page');
  return updatedData as StaffAppointmentWithRelations;
}

