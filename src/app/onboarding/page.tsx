import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createSalon } from '@/app/actions/owner/salon';
import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { OnboardingForm } from './onboarding-form';
import { Scissors } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Onboarding — BookMi',
  robots: {
    index: false,
    follow: false,
  },
};

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
    <main className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="size-4" />
          </div>
          <span className="text-base font-bold tracking-tight">BookMi</span>
        </div>
        <UserButton />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-6">
               <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                 <Scissors className="size-8 text-primary" />
               </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Welcome to BookMi
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Set up your salon to get started. Your unique booking link will be generated automatically.
            </p>
          </div>
          
          <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-sm p-6 sm:p-8">
            <OnboardingForm action={handleCreateSalon} />
          </div>
        </div>
      </div>
    </main>
  );
}
