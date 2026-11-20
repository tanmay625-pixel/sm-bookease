'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCachedAuth } from '@/lib/supabase/cached';
import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import type { Database } from '@/lib/supabase/types';

type StaffRow = Database['public']['Tables']['staff']['Row'];
type StaffInsert = Omit<Database['public']['Tables']['staff']['Insert'], 'salon_id'>;

async function requireAuth() {
  const { userId } = await getCachedAuth();
  if (!userId) redirect('/sign-in');
  return userId;
}

export async function listStaff(salonId: string): Promise<StaffRow[]> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  const { data: staffData, error } = await supabase
    .from('staff')
    .select('*')
    .eq('salon_id', salonId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to list staff: ${error.message}`);
  return (staffData ?? []) as StaffRow[];
}

export async function createStaff(
  salonId: string,
  data: StaffInsert
): Promise<StaffRow> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  const cleanPhone = data.phone.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    throw new Error('Contact number must be exactly 10 digits.');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: createdData, error } = await (supabase as any)
    .from('staff')
    .insert({ ...data, phone: cleanPhone, salon_id: salonId })
    .select()
    .single() as { data: StaffRow | null; error: { message: string } | null };
  const created = createdData;

  if (error || !created) {
    throw new Error(`Failed to create staff: ${error?.message ?? 'unknown'}`);
  }

  revalidatePath('/[slug]/(owner)/settings', 'page');
  return created;
}

export async function updateStaff(
  staffId: string,
  data: Partial<StaffInsert>
): Promise<void> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  let cleanPhone: string | undefined = undefined;
  if (data.phone !== undefined) {
    cleanPhone = data.phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      throw new Error('Contact number must be exactly 10 digits.');
    }
  }

  // If phone number is being changed, we need to:
  // 1. Check if the phone actually changed
  // 2. If so, reset is_verified and increment session_version (invalidates active sessions)
  if (cleanPhone !== undefined) {
    // Fetch current phone via service client to get auth-sensitive fields
    const serviceClient = createServiceSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (serviceClient as any)
      .from('staff')
      .select('phone, session_version')
      .eq('id', staffId)
      .single();

    if (existing && existing.phone !== cleanPhone) {
      // Phone changed — reset verification status and invalidate existing sessions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: resetErr } = await (serviceClient as any)
        .from('staff')
        .update({
          ...data,
          phone: cleanPhone,
          is_verified: false,
          session_version: (existing.session_version ?? 1) + 1,
        })
        .eq('id', staffId);

      if (resetErr) throw new Error(`Failed to update staff: ${resetErr.message}`);
      revalidatePath('/[slug]/(owner)/settings', 'page');
      return;
    }
  }

  // Normal update (no phone change, or phone unchanged)
  // RLS ensures only the owner can update staff in their salon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('staff')
    .update(cleanPhone !== undefined ? { ...data, phone: cleanPhone } : data)
    .eq('id', staffId);

  if (error) throw new Error(`Failed to update staff: ${error.message}`);
  revalidatePath('/[slug]/(owner)/settings', 'page');
}

export async function deleteStaff(staffId: string): Promise<void> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('staff')
    .delete()
    .eq('id', staffId);

  if (error) throw new Error(`Failed to delete staff: ${error.message}`);
  revalidatePath('/[slug]/(owner)/settings', 'page');
}
