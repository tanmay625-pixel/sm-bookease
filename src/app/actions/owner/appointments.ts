'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import type { Database } from '@/lib/supabase/types';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type AppointmentStatus = Database['public']['Enums']['appointment_status'];
type CustomerRow = Database['public']['Tables']['customers']['Row'];

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
): Promise<(AppointmentRow & { customers: CustomerRow | null })[]> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  let query = supabase
    .from('appointments')
    .select('*, customers(*)')
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

  let results = (data ?? []) as (AppointmentRow & { customers: CustomerRow | null })[];

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: apptData, error } = await (supabase as any)
    .from('appointments')
    .insert({
      salon_id: input.salonId,
      customer_id: input.customerId,
      service_id: input.serviceId,
      slot_start: input.slotStart,
      slot_end: input.slotEnd,
      staff_id: input.staffId ?? null,
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
  return data;
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
  const { data: existingData, error: fetchError } = await supabase
    .from('appointments')
    .select('*, customers(*), services(*), salons(*)')
    .eq('id', appointmentId)
    .single();
  const existing = existingData as (AppointmentRow & { customers: CustomerRow | null }) | null;

  if (fetchError || !existing) {
    throw new Error(`Appointment not found: ${fetchError?.message ?? 'unknown'}`);
  }

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
  CustomerRow & { appointments: AppointmentRow[] }
> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  const { data, error } = await supabase
    .from('customers')
    .select('*, appointments(*)')
    .eq('id', clientId)
    .single();

  if (error || !data) {
    throw new Error(`Client not found: ${error?.message ?? 'unknown'}`);
  }

  return data as CustomerRow & { appointments: AppointmentRow[] };
}
