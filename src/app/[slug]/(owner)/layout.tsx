import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createClerkSupabaseClient } from '@/lib/supabase/server';

/**
 * Owner route group layout.
 *
 * Two-step protection:
 * 1. Confirms the request has an active Clerk session (→ /sign-in if not)
 * 2. Confirms the authenticated Clerk user owns the salon with this slug
 *    (→ / if not — could be replaced with a 403 page)
 *
 * This check lives HERE, in the layout server component, not in proxy.ts.
 * See CVE-2025-29927 guidance: proxy/middleware is not a safe auth boundary
 * for per-resource ownership checks.
 *
 * params is a Promise in Next.js 16 — always await it.
 */
export default async function OwnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = createClerkSupabaseClient();

  const { data: salon } = await supabase
    .from('salons')
    .select('id, name')
    .eq('slug', slug)
    .eq('owner_clerk_id', userId)
    .single();

  if (!salon) {
    // This user doesn't own a salon at this slug — redirect to home
    redirect('/');
  }

  return <>{children}</>;
}
