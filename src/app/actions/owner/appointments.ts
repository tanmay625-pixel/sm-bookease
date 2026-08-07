'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import type { Database, CustomerRow, ServiceRow, StaffRow } from '@/lib/supabase/types';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type AppointmentStatus = Database['public']['Enums']['appointment_status'];

export type AppointmentWithRelations = AppointmentRow & {
  customers: CustomerRow | null;
  services: ServiceRow | null;
  staff: StaffRow | null;
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
    .select('*, customers(*), services(*), staff(*)')
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
  serviceId: string;
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

  let assignedStaffId: string | null = null;

  if (input.staffId && input.staffId !== 'any') {
    assignedStaffId = input.staffId;
  } else {
    // Fetch all staff for this salon to find an available member
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('salon_id', input.salonId)
      .order('created_at', { ascending: true });
    const salonStaff = (staffData ?? []) as { id: string }[];

    if (salonStaff.length > 0) {
      // Find busy staff during this slot
      const { data: conflictsData } = await supabase
        .from('appointments')
        .select('staff_id')
        .eq('salon_id', input.salonId)
        .in('status', ['pending', 'confirmed'])
        .lt('slot_start', input.slotEnd)
        .gt('slot_end', input.slotStart);

      const conflicts = (conflictsData ?? []) as Array<{ staff_id: string | null }>;
      const busyStaffIds = new Set(conflicts.map((c) => c.staff_id).filter(Boolean) as string[]);

      const freeStaff = salonStaff.find((s) => !busyStaffIds.has(s.id));
      assignedStaffId = freeStaff ? freeStaff.id : salonStaff[0].id;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: apptData, error } = await (supabase as any)
    .from('appointments')
    .insert({
      salon_id: input.salonId,
      customer_id: input.customerId,
      service_id: input.serviceId,
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

  revalidatePath('/[slug]/(owner)/appointments', 'page');
  revalidatePath('/[slug]/(owner)/dashboard', 'page');
  return data;
}

// ─────────────────────────────────────────────
// updateAppointmentDetails (Owner Edit Mode)
// ─────────────────────────────────────────────

type UpdateAppointmentDetailsInput = {
  appointmentId: string;
  staffId?: string;    // UUID or undefined (if 'any' or omitted)
  slotStart: string;   // ISO datetime string
  slotEnd: string;     // ISO datetime string
  notes?: string;
};

export async function updateAppointmentDetails(
  input: UpdateAppointmentDetailsInput
): Promise<AppointmentWithRelations> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  // 1. Fetch appointment to verify existence & get salon_id
  const { data: existingData, error: fetchErr } = await supabase
    .from('appointments')
    .select('id, salon_id, service_id, status, slot_start')
    .eq('id', input.appointmentId)
    .single();

  const existing = existingData as Pick<AppointmentRow, 'id' | 'salon_id' | 'service_id' | 'status' | 'slot_start'> | null;
  if (fetchErr || !existing) {
    throw new Error('Appointment not found');
  }

  // Reject editing past appointments
  if (new Date(existing.slot_start).getTime() <= Date.now()) {
    throw new Error('Cannot edit past appointments.');
  }

  // Reject rescheduling to the past
  if (new Date(input.slotStart).getTime() <= Date.now()) {
    throw new Error('Cannot reschedule an appointment to a time in the past.');
  }

  // 2. Query salon staff
  const { data: staffData } = await supabase
    .from('staff')
    .select('id, name')
    .eq('salon_id', existing.salon_id)
    .order('created_at', { ascending: true });
  const salonStaff = (staffData ?? []) as { id: string; name: string }[];

  // 3. Query conflicting appointments (excluding this appointment so it doesn't conflict with itself)
  const { data: conflictsData } = await supabase
    .from('appointments')
    .select('id, staff_id')
    .eq('salon_id', existing.salon_id)
    .neq('id', input.appointmentId)
    .in('status', ['pending', 'confirmed'])
    .lt('slot_start', input.slotEnd)
    .gt('slot_end', input.slotStart);

  const conflicts = (conflictsData ?? []) as Array<{ id: string; staff_id: string | null }>;
  const busyStaffIds = new Set(conflicts.map((c) => c.staff_id).filter(Boolean) as string[]);

  let assignedStaffId: string | null = null;

  if (input.staffId && input.staffId !== 'any') {
    // Specific staff selected
    if (busyStaffIds.has(input.staffId)) {
      throw new Error('This staff member already has an appointment at this time — please choose a different time or staff member.');
    }
    assignedStaffId = input.staffId;
  } else {
    // 'any' staff selected — find first available staff member
    if (salonStaff.length > 0) {
      const freeStaff = salonStaff.find((s) => !busyStaffIds.has(s.id));
      if (!freeStaff) {
        throw new Error('All staff members are booked for this time slot — please choose another time.');
      }
      assignedStaffId = freeStaff.id;
    } else {
      if (conflicts.length > 0) {
        throw new Error('This time slot is no longer available — please choose another time.');
      }
      assignedStaffId = null;
    }
  }

  // 4. Update appointment
  const updatePayload: Partial<AppointmentRow> = {
    staff_id: assignedStaffId,
    slot_start: input.slotStart,
    slot_end: input.slotEnd,
  };
  if (input.notes !== undefined) {
    updatePayload.notes = input.notes || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedData, error: updateErr } = await (supabase as any)
    .from('appointments')
    .update(updatePayload)
    .eq('id', input.appointmentId)
    .select('*, customers(*), services(*), staff(*)')
    .single();

  if (updateErr || !updatedData) {
    throw new Error(`Failed to update appointment: ${updateErr?.message ?? 'unknown'}`);
  }

  revalidatePath('/[slug]/(owner)/appointments', 'page');
  revalidatePath('/[slug]/(owner)/dashboard', 'page');
  return updatedData as AppointmentWithRelations;
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

  // Send WhatsApp confirmation when status transitions to 'confirmed'
  if (status === 'confirmed') {
    const customer = existing.customers as CustomerRow | null;
    if (customer?.phone) {
      // TODO: confirm exact template name once approved by Meta
      await sendWhatsAppMessage(
        customer.phone,
        'appointment_confirmed',  // TODO: confirm exact template name once approved
        'en',
        [
          customer.name,
          new Date(existing.slot_start).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        ],
        existing.salon_id
      ).catch((err) => {
        // Non-fatal — log but don't fail the status update
        console.error('[updateAppointmentStatus] WhatsApp send failed:', err);
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
    .select('*, appointments(*, services(*), staff(*))')
    .eq('id', clientId)
    .single();

  if (error || !data) {
    throw new Error(`Client not found: ${error?.message ?? 'unknown'}`);
  }

  return data as CustomerRow & { appointments: AppointmentWithRelations[] };
}
