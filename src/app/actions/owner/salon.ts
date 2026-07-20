'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { generateSlug } from '@/lib/slug';

// ─────────────────────────────────────────────
// createSalon
// Called once during owner onboarding.
// ─────────────────────────────────────────────

export async function createSalon(name: string): Promise<{ slug: string }> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const slug = await generateSlug(name);
  const supabase = createClerkSupabaseClient();

  const { data, error } = await supabase
    .from('salons')
    .insert({ owner_clerk_id: userId, name, slug })
    .select('slug')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create salon: ${error?.message ?? 'unknown error'}`);
  }

  return { slug: data.slug };
}

// ─────────────────────────────────────────────
// updateSalonSettings
// ─────────────────────────────────────────────

type SalonSettings = {
  name?: string;
  workingHours?: { start: string; end: string };
  workingDays?: string[];
};

export async function updateSalonSettings(
  salonId: string,
  settings: SalonSettings
): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = createClerkSupabaseClient();

  const update: Record<string, unknown> = {};
  if (settings.name !== undefined) update.name = settings.name;
  if (settings.workingHours !== undefined) update.working_hours = settings.workingHours;
  if (settings.workingDays !== undefined) update.working_days = settings.workingDays;

  // RLS ensures only the owner of this salon can update it
  const { error } = await supabase
    .from('salons')
    .update(update)
    .eq('id', salonId);

  if (error) {
    throw new Error(`Failed to update salon settings: ${error.message}`);
  }

  revalidatePath('/[slug]/(owner)/settings', 'page');
}

// ─────────────────────────────────────────────
// getSalonBySlug — owner context
// ─────────────────────────────────────────────

export async function getSalonBySlug(slug: string) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = createClerkSupabaseClient();

  const { data, error } = await supabase
    .from('salons')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data;
}
