import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createClerkSupabaseClient } from '@/lib/supabase/server';

/**
 * Root page — routes authenticated users to the right place:
 * - Unauthenticated → /sign-in (handled by proxy.ts)
 * - Has a salon → /{slug}/dashboard
 * - No salon yet → /onboarding
 */
export default async function Home() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = createClerkSupabaseClient();
  const { data: salonData } = await supabase
    .from('salons')
    .select('slug')
    .eq('owner_clerk_id', userId)
    .single();
  const salon = salonData as { slug: string } | null;

  if (salon) {
    redirect(`/${salon.slug}/dashboard`);
  } else {
    redirect('/onboarding');
  }
}
