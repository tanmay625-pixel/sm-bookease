'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClerkSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type StaffRow = Database['public']['Tables']['staff']['Row'];
type StaffInsert = Omit<Database['public']['Tables']['staff']['Insert'], 'salon_id'>;

async function requireAuth() {
  const { userId } = await auth();
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: createdData, error } = await (supabase as any)
    .from('staff')
    .insert({ ...data, salon_id: salonId })
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

  // RLS ensures only the owner can update staff in their salon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('staff')
    .update(data)
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
