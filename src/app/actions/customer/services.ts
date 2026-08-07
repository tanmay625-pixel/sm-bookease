'use server';

import { createServiceSupabaseClient } from '@/lib/supabase/service';
import type { ServiceRow, SalonRow } from '@/lib/supabase/types';

/**
 * getPublicServices
 *
 * Public (no Clerk session required) — uses service-role client purely so
 * anonymous customers can browse services before they sign in.
 *
 * READ-ONLY: single SELECT, no insert / update / delete path.
 */
export async function getPublicServices(
  salonSlug: string
): Promise<ServiceRow[]> {
  const supabase = createServiceSupabaseClient();

  const { data: salonData } = await supabase
    .from('salons')
    .select('id')
    .eq('slug', salonSlug)
    .single();
  const salon = salonData as Pick<SalonRow, 'id'> | null;

  if (!salon) return [];

  const { data, error } = await supabase
    .from('services')
    .select('id, salon_id, name, duration_minutes, price, created_at')
    .eq('salon_id', salon.id)
    .order('name');

  if (error) throw new Error(`Failed to load services: ${error.message}`);
  return (data ?? []) as ServiceRow[];
}
