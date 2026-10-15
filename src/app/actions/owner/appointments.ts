'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { sendAppointmentConfirmation } from '@/lib/notifications';
import type { Database, CustomerRow, ServiceRow, StaffRow } from '@/lib/supabase/types';
import { findConflictingStaffIds } from '@/lib/availability';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type AppointmentStatus = Database['public']['Enums']['appointment_status'];

export type AppointmentWithRelations = AppointmentRow & {
  customers: CustomerRow | null;
  services: ServiceRow | null;
  staff: StaffRow | null;
  appointment_services?: { services: ServiceRow | null }[];
};

async function requireAuth() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return userId;
}

// ─────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────

type AppointmentFilters = {
  dateFrom?: string;     // ISO date string
  dateTo?: string;       // ISO date string
  status?: AppointmentStatus;
  staffId?: string;
  search?: string;       // matches customer name or phone (via joined customers table)
};

export async function listAppointments(
  salonId: string,
  filters: AppointmentFilters = {}
): Promise<AppointmentWithRelations[]> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  let query = supabase
    .from('appointments')
    .select('*, customers(*), services(*), staff(*), appointment_services(services(*))')
    .eq('salon_id', salonId)
    .order('slot_start', { ascending: true });

  if (filters.dateFrom) {
    query = query.gte('slot_start', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('slot_start', filters.dateTo);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.staffId) {
    query = query.eq('staff_id', filters.staffId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to list appointments: ${error.message}`);

  let results = (data ?? []) as AppointmentWithRelations[];

  // Post-filter by search (customer name or phone)
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

type CreateAppointmentInput = {
  salonId: string;
  customerId: string;
  serviceIds: string[];
  slotStart: string;   // ISO datetime string
  slotEnd: string;     // ISO datetime string
  staffId?: string;
  notes?: string;
};

export async function createAppointmentAsOwner(
  input: CreateAppointmentInput
): Promise<AppointmentRow> {
  const userId = await requireAuth();
  const supabase = createClerkSupabaseClient();

  // Guard: reject if the slot is in the past at the time the request arrives
  if (new Date(input.slotStart).getTime() <= Date.now()) {
    throw new Error('Selected appointment time is in the past.');
  }

  // Fresh conflict check immediately before insert — protects against race conditions
  const { data: conflictsData } = await supabase
    .from('appointments')
    .select('id, staff_id, slot_start, slot_end')
    .eq('salon_id', input.salonId)
    .in('status', ['pending', 'confirmed'])
    .lt('slot_start', input.slotEnd)
    .gt('slot_end', input.slotStart);

  const conflicts = (conflictsData ?? []) as Array<{ id: string; staff_id: string | null; slot_start: string; slot_end: string }>;
  const busyStaffIds = findConflictingStaffIds(
    conflicts,
    new Date(input.slotStart).getTime(),
    new Date(input.slotEnd).getTime()
  );

  let assignedStaffId: string | null = null;

  if (input.staffId && input.staffId !== 'any') {
    // Specific staff — reject if busy
    if (busyStaffIds.has(input.staffId)) {
      throw new Error('This staff member already has an appointment at this time — please choose a different time or staff member.');
    }
    assignedStaffId = input.staffId;
  } else {
    // "Any" — assign first actually-free staff member
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('salon_id', input.salonId)
      .order('created_at', { ascending: true });
    const salonStaff = (staffData ?? []) as { id: string }[];

    if (salonStaff.length > 0) {
      const freeStaff = salonStaff.find((s) => !busyStaffIds.has(s.id));
      if (!freeStaff) {
        throw new Error('All staff members are booked at this time — please choose a different time.');
      }
      assignedStaffId = freeStaff.id;
    } else {
      // No staff records (solo operator)
      if (conflicts.length > 0) {
        throw new Error('This time slot is already booked — please choose a different time.');
      }
      assignedStaffId = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: apptData, error } = await (supabase as any)
    .from('appointments')
    .insert({
      salon_id: input.salonId,
      customer_id: input.customerId,
      service_id: input.serviceIds[0], // primary for backward compat
      slot_start: input.slotStart,
      slot_end: input.slotEnd,
      staff_id: assignedStaffId,
      notes: input.notes ?? null,
      status: 'pending',
      created_by: userId, // owner's Clerk ID
    })
    .select()
    .single() as { data: AppointmentRow | null; error: { message: string } | null };
  const data = apptData;

  if (error || !data) {
    throw new Error(`Failed to create appointment: ${error?.message ?? 'unknown'}`);
  }

  // Insert into junction table
  const appointmentServices = input.serviceIds.map((serviceId) => ({
    appointment_id: data.id,
    service_id: serviceId,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: junctionError } = await (supabase as any)
    .from('appointment_services')
    .insert(appointmentServices);

  if (junctionError) {
    console.error('Failed to insert appointment_services:', junctionError);
  }

  revalidatePath('/[slug]/(owner)/appointments', 'page');
  revalidatePath('/[slug]/(owner)/dashboard', 'page');
  return data;
}

// ─────────────────────────────────────────────
// updateAppointmentDetails (Owner Edit Mode)
// ─────────────────────────────────────────────

type UpdateAppointmentDetailsInput = {
  appointmentId: string;
  salonId: string;
  serviceIds?: string[];
  slotStart?: string;
  slotEnd?: string;
  staffId?: string | null;
  notes?: string | null;
};

export async function updateAppointmentDetails(
  input: UpdateAppointmentDetailsInput
): Promise<AppointmentWithRelations> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  // 1. Fetch appointment to verify existence & get salon_id
  const { data: existingData, error: fetchErr } = await supabase
    .from('appointments')
    .select('id, salon_id, service_id, status, slot_start, slot_end')
    .eq('id', input.appointmentId)
    .single();

  const existing = existingData as Pick<AppointmentRow, 'id' | 'salon_id' | 'service_id' | 'status' | 'slot_start' | 'slot_end'> | null;
  if (fetchErr || !existing) {
    throw new Error('Appointment not found');
  }

  // Reject editing past appointments
  if (new Date(existing.slot_start).getTime() <= Date.now()) {
    throw new Error('Cannot edit past appointments.');
  }

  // Reject rescheduling to the past
  if (input.slotStart && new Date(input.slotStart).getTime() <= Date.now()) {
    throw new Error('Cannot reschedule an appointment to a time in the past.');
  }

  // 2. Query salon staff
  const { data: staffData } = await supabase
    .from('staff')
    .select('id, name')
    .eq('salon_id', existing.salon_id)
    .order('created_at', { ascending: true });
  const salonStaff = (staffData ?? []) as { id: string; name: string }[];

  // 3. Query conflicting appointments
  const slotStart = input.slotStart || existing.slot_start;
  const slotEnd = input.slotEnd || existing.slot_end;

  const { data: conflictsData } = await supabase
    .from('appointments')
    .select('id, staff_id, slot_start, slot_end')
    .eq('salon_id', existing.salon_id)
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

  let assignedStaffId: string | null = null;

  if (input.staffId !== undefined) {
    if (input.staffId && input.staffId !== 'any') {
        if (busyStaffIds.has(input.staffId)) {
          throw new Error('This staff member already has an appointment at this time — please choose a different time or staff member.');
        }
        assignedStaffId = input.staffId;
    } else {
        // "Any" — assign first actually-free staff member
        const freeStaff = salonStaff.find((s) => !busyStaffIds.has(s.id));
        if (salonStaff.length > 0 && !freeStaff) {
          throw new Error('All staff members are booked at this time — please choose a different time.');
        }
        assignedStaffId = freeStaff ? freeStaff.id : null;
    }
  }

  // 4. Update appointment
  const updates: Partial<AppointmentRow> = {};
  if (input.serviceIds && input.serviceIds.length > 0) {
    updates.service_id = input.serviceIds[0];
  }
  if (input.slotStart) updates.slot_start = input.slotStart;
  if (input.slotEnd) updates.slot_end = input.slotEnd;
  if (input.staffId !== undefined) updates.staff_id = assignedStaffId;
  if (input.notes !== undefined) updates.notes = input.notes;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('appointments')
    .update(updates)
    .eq('id', input.appointmentId);

  if (error) {
    throw new Error(`Failed to update appointment: ${error.message}`);
  }

  // Update junction table if serviceIds provided
  if (input.serviceIds && input.serviceIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('appointment_services')
      .delete()
      .eq('appointment_id', input.appointmentId);
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('appointment_services')
      .insert(input.serviceIds.map(sid => ({
        appointment_id: input.appointmentId,
        service_id: sid
      })));
  }

  // Fetch updated data
  const { data: updatedData, error: updatedFetchErr } = await supabase
    .from('appointments')
    .select('*, customers(*), services(*), staff(*), appointment_services(services(*))')
    .eq('id', input.appointmentId)
    .single();

  if (updatedFetchErr || !updatedData) {
    throw new Error(`Failed to fetch updated appointment: ${updatedFetchErr?.message}`);
  }

  revalidatePath('/[slug]/(owner)/appointments', 'page');
  revalidatePath('/[slug]/(owner)/dashboard', 'page');
  return updatedData as unknown as AppointmentWithRelations;
}

/**
 * Updates an appointment's status.
 * When transitioning to 'confirmed', triggers a WhatsApp confirmation message.
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
): Promise<void> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  // Fetch the appointment first so we can get customer phone + service info for the WA message
  const { data: existingData } = await supabase
    .from('appointments')
    .select('*, customers(*), services(*)')
    .eq('id', appointmentId)
    .single();
  const existing = existingData as (AppointmentRow & {
    customers: CustomerRow | null;
    services: { name: string } | null;
  }) | null;

  if (!existing) throw new Error('Appointment not found');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId);

  if (error) throw new Error(`Failed to update appointment status: ${error.message}`);

  // Send confirmation notification when status transitions to 'confirmed'
  if (status === 'confirmed') {
    const customer = existing.customers as CustomerRow | null;
    if (customer?.phone) {
      const formattedDate = new Date(existing.slot_start).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      await sendAppointmentConfirmation(
        customer.phone,
        customer.name,
        formattedDate,
        existing.salon_id
      ).catch((err) => {
        // Non-fatal — log but don't fail the status update
        console.error('[updateAppointmentStatus] Confirmation notification send failed:', err);
      });
    }
  }

  revalidatePath('/[slug]/(owner)/appointments', 'page');
  revalidatePath('/[slug]/(owner)/dashboard', 'page');
}

// ─────────────────────────────────────────────
// Clients (read-only from owner side)
// ─────────────────────────────────────────────

export async function listClients(
  salonId: string,
  search?: string
): Promise<CustomerRow[]> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  let query = supabase
    .from('customers')
    .select('*')
    .eq('salon_id', salonId)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data: clientsData, error } = await query;
  if (error) throw new Error(`Failed to list clients: ${error.message}`);
  return (clientsData ?? []) as CustomerRow[];
}

export async function getClientDetail(clientId: string): Promise<
  CustomerRow & { appointments: AppointmentWithRelations[] }
> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  const { data, error } = await supabase
    .from('customers')
    .select('*, appointments(*, services(*), staff(*), appointment_services(services(*)))')
    .eq('id', clientId)
    .single();

  if (error || !data) {
    throw new Error(`Client not found: ${error?.message ?? 'unknown'}`);
  }

  return data as CustomerRow & { appointments: AppointmentWithRelations[] };
}
