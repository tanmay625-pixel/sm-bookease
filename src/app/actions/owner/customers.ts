'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClerkSupabaseClient } from '@/lib/supabase/server';
import type { CustomerRow } from '@/lib/supabase/types';

/**
 * upsertCustomer
 *
 * Owner-side action — uses createClerkSupabaseClient() + requireAuth() so
 * Clerk JWT is forwarded and RLS enforces that the caller owns the salon.
 * An owner cannot upsert a customer into a salon they don't own because the
 * database-level RLS policy will reject it.
 */

async function requireAuth() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return userId;
}

type UpsertCustomerInput = {
  name: string;
  phone: string;
  email?: string | null;
};

export async function upsertCustomer(
  salonId: string,
  input: UpsertCustomerInput
): Promise<CustomerRow> {
  await requireAuth();
  const supabase = createClerkSupabaseClient();

  // Try insert first; if phone already exists for this salon, fetch existing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upsertData } = await (supabase as any)
    .from('customers')
    .upsert(
      {
        salon_id: salonId,
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
      },
      { onConflict: 'salon_id,phone', ignoreDuplicates: false }
    )
    .select()
    .single() as { data: CustomerRow | null; error: unknown };

  if (upsertData) {
    revalidatePath('/[slug]/(owner)/clients', 'page');
    return upsertData;
  }

  // ignoreDuplicates: false should always return the row; fall back to explicit fetch
  const { data: existing, error: fetchError } = await supabase
    .from('customers')
    .select('*')
    .eq('salon_id', salonId)
    .eq('phone', input.phone)
    .single();

  if (fetchError || !existing) {
    throw new Error('Failed to resolve customer record');
  }

  revalidatePath('/[slug]/(owner)/clients', 'page');
  return existing as CustomerRow;
}
