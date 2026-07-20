import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

/**
 * Supabase client for owner-authenticated requests.
 * Uses Clerk's native Supabase integration (third-party auth, not the
 * deprecated JWT template method). The accessToken callback passes the
 * Clerk session token directly — Supabase verifies it against the configured
 * Clerk issuer.
 *
 * RLS policies on the DB compare against auth.jwt() ->> 'sub' (Clerk user ID
 * as text). Never use auth.uid() — it expects a UUID and will silently fail.
 *
 * Do NOT put this client in a module-level variable. Create a new instance
 * per request (required for Fluid compute / serverless correctness).
 */
export function createClerkSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      accessToken: async () => (await auth()).getToken(),
    }
  );
}
