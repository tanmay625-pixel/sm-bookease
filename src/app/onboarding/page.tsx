import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createSalon } from '@/app/actions/owner/salon';
import { createClerkSupabaseClient } from '@/lib/supabase/server';

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // If the user already has a salon, go straight to dashboard
  const supabase = createClerkSupabaseClient();
  const { data: salonData } = await supabase
    .from('salons')
    .select('slug')
    .eq('owner_clerk_id', userId)
    .single();
  const existingSalon = salonData as { slug: string } | null;

  if (existingSalon) {
    redirect(`/${existingSalon.slug}/dashboard`);
  }

  async function handleCreateSalon(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    if (!name?.trim()) throw new Error('Salon name is required');

    const { slug } = await createSalon(name.trim());
    redirect(`/${slug}/dashboard`);
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '480px', fontFamily: 'sans-serif' }}>
      <h1>Welcome to BookMi</h1>
      <p>Set up your salon to get started. Your unique booking link will be generated automatically.</p>

      <form action={handleCreateSalon} style={{ marginTop: '1.5rem' }}>
        <label>
          Salon name
          <input
            id="salon-name"
            name="name"
            type="text"
            placeholder="e.g. The Hair Studio"
            required
            autoFocus
            style={{
              display: 'block',
              width: '100%',
              padding: '0.5rem',
              marginTop: '0.5rem',
              marginBottom: '1rem',
              fontSize: '1rem',
            }}
          />
        </label>
        <button type="submit" style={{ padding: '0.5rem 1.5rem', fontSize: '1rem' }}>
          Create my salon →
        </button>
      </form>

      {/* Placeholder for v0 onboarding UI */}
      <section style={{ marginTop: '3rem', padding: '1rem', border: '1px dashed #ccc' }}>
        <p>[Onboarding UI — v0 component slot]</p>
      </section>
    </main>
  );
}
