import { cache } from 'react';
import { auth } from '@clerk/nextjs/server';
import { createClerkSupabaseClient } from './server';
import type { SalonRow } from './types';

/**
 * Per-request memoised Clerk auth() call.
 *
 * React.cache() scopes the memoisation to a single React render tree
 * (i.e. one server-side HTTP request). Results are never shared across
 * requests, users, or tenants — zero cross-tenant leakage risk.
 *
 * Eliminates the N×auth() problem: the OwnerLayout, every (owner) page,
 * and every server action called during SSR all share one Clerk JWT read
 * per request instead of independently re-executing it.
 */
export const getCachedAuth = cache(async () => {
  return auth();
});

/**
 * Per-request memoised salon ownership fetch.
 *
 * The first caller within a render tree (typically OwnerLayout) hits
 * Supabase. Every subsequent caller with the same slug receives the
 * cached row — eliminating the N+1 salon query pattern where layout +
 * every child page each fetched salons independently.
 *
 * Selects all columns that any owner page may need so the cached result
 * is reusable everywhere without a second query.
 *
 * Returns null if:
 *   - No Clerk session exists, OR
 *   - The authenticated user does not own a salon with this slug.
 * Callers must handle null (redirect to '/' or '/sign-in').
 */
export const getCachedOwnerSalon = cache(async (slug: string): Promise<SalonRow | null> => {
  const { userId } = await getCachedAuth();
  if (!userId) return null;

  const supabase = createClerkSupabaseClient();
  const { data } = await supabase
    .from('salons')
    .select('*')
    .eq('slug', slug)
    .eq('owner_clerk_id', userId)
    .single();

  return (data as SalonRow | null);
});
