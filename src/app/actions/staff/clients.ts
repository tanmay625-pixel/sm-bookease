'use server';

import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { requireStaffSession } from '@/lib/staff-session';
import type { CustomerRow } from '@/lib/supabase/types';
import type { StaffAppointmentWithRelations } from './appointments';

async function requireStaffAuth(slug: string) {
  return await requireStaffSession(slug);
}

// ─────────────────────────────────────────────
// listSalonClients
// All customers in the salon (staff can see all clients).
// ─────────────────────────────────────────────

export async function listSalonClients(
  slug: string,
  search?: string
): Promise<CustomerRow[]> {
  const session = await requireStaffAuth(slug);
  const supabase = createServiceSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('customers')
    .select('*')
    .eq('salon_id', session.salonId)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list clients: ${error.message}`);
  return (data ?? []) as CustomerRow[];
}

// ─────────────────────────────────────────────
// getSalonClientDetail
// Full salon appointment history for a customer (for treatment context).
// ─────────────────────────────────────────────

export async function getSalonClientDetail(
  slug: string,
  clientId: string
): Promise<CustomerRow & { appointments: StaffAppointmentWithRelations[] }> {
  const session = await requireStaffAuth(slug);
  const supabase = createServiceSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('customers')
    .select('*, appointments(*, services(*), staff(*), appointment_services(services(*)))')
    .eq('id', clientId)
    .eq('salon_id', session.salonId)   // ensure client belongs to this salon
    .single();

  if (error || !data) {
    throw new Error(`Client not found: ${error?.message ?? 'unknown'}`);
  }

  return data as CustomerRow & { appointments: StaffAppointmentWithRelations[] };
}

// ─────────────────────────────────────────────
// upsertSalonCustomerAsStaff
// Used when staff creates a new appointment for a walk-in.
// ─────────────────────────────────────────────

export async function upsertSalonCustomerAsStaff(
  slug: string,
  input: { name: string; phone: string; email?: string | null }
): Promise<CustomerRow> {
  const session = await requireStaffAuth(slug);
  const supabase = createServiceSupabaseClient();

  const cleanPhone = input.phone.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    throw new Error('Customer contact number must be 10 digits.');
  }

  // Check if customer already exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('customers')
    .select('*')
    .eq('salon_id', session.salonId)
    .eq('phone', cleanPhone)
    .single();

  if (existing) return existing as CustomerRow;

  // Insert new customer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any)
    .from('customers')
    .insert({
      salon_id: session.salonId,
      name: input.name,
      phone: cleanPhone,
      email: input.email ?? null,
    })
    .select()
    .single();

  if (error || !inserted) {
    throw new Error(`Failed to create customer: ${error?.message ?? 'unknown'}`);
  }

  return inserted as CustomerRow;
}

