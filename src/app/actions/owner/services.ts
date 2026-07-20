'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClerkSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type ServiceRow = Database['public']['Tables']['services']['Row'];
type ServiceInsert = Omit<Database['public']['Tables']['services']['Insert'], 'salon_id'>;

async function requireAuth() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return userId;
}

export async function listServices(salonId: string): Promise<ServiceRow[]> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('salon_id', salonId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to list services: ${error.message}`);
  return data ?? [];
}

export async function createService(
  salonId: string,
  data: ServiceInsert
): Promise<ServiceRow> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  const { data: created, error } = await supabase
    .from('services')
    .insert({ ...data, salon_id: salonId })
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Failed to create service: ${error?.message ?? 'unknown'}`);
  }

  revalidatePath('/[slug]/(owner)/settings', 'page');
  return created;
}

export async function updateService(
  serviceId: string,
  data: Partial<ServiceInsert>
): Promise<void> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  const { error } = await supabase
    .from('services')
    .update(data)
    .eq('id', serviceId);

  if (error) throw new Error(`Failed to update service: ${error.message}`);
  revalidatePath('/[slug]/(owner)/settings', 'page');
}

export async function deleteService(serviceId: string): Promise<void> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId);

  if (error) throw new Error(`Failed to delete service: ${error.message}`);
  revalidatePath('/[slug]/(owner)/settings', 'page');
}
