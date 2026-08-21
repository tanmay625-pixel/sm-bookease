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

  // First, check if a customer with this phone already exists for this salon.
  // If they do, preserve their existing name (ignore what the owner typed).
  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('salon_id', salonId)
    .eq('phone', input.phone)
    .single();

  if (existing) {
    // Customer already exists — keep their stored name, only update email if
    // they don't have one yet and the owner provided one.
    revalidatePath('/[slug]/(owner)/clients', 'page');
    return existing as CustomerRow;
  }

  // New customer — insert with the provided name/email.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertError } = await (supabase as any)
    .from('customers')
    .insert({
      salon_id: salonId,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
    })
    .select()
    .single() as { data: CustomerRow | null; error: unknown };

  if (insertError || !inserted) {
    throw new Error('Failed to create customer record');
  }

  revalidatePath('/[slug]/(owner)/clients', 'page');
  return inserted;
}
