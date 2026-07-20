import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

/**
 * Service-role Supabase client — bypasses RLS entirely.
 * USE ONLY in server-side code (Server Actions, Route Handlers).
 * NEVER import this in client components or expose the service role key.
 *
 * Used for all customer-facing operations:
 * - OTP storage / verification
 * - Customer appointment booking (manual session-cookie check instead of RLS)
 * - WhatsApp message log writes
 *
 * Do NOT put this client in a module-level variable. Create a new instance
 * per request (required for Fluid compute / serverless correctness).
 */
export function createServiceSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
