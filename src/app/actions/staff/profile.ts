'use server';

import { revalidatePath } from 'next/cache';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import {
  requireStaffSession,
  validateStaffPassword,
  hashStaffPassword,
  verifyStaffPassword,
} from '@/lib/staff-session';
import type { SalonRow } from '@/lib/supabase/types';

type StaffProfileRow = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string;
  is_verified: boolean;
};

type StaffProfileWithSalon = StaffProfileRow & {
  salon: {
    name: string;
    working_hours: { start: string; end: string };
    working_days: string[];
    time_format: '12h' | '24h';
  };
};

async function requireStaffAuth(slug: string) {
  return await requireStaffSession(slug);
}

// ─────────────────────────────────────────────
// getStaffProfile
// ─────────────────────────────────────────────

export async function getStaffProfile(slug: string): Promise<StaffProfileWithSalon> {
  const session = await requireStaffAuth(slug);
  const supabase = createServiceSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staffData, error: staffErr } = await (supabase as any)
    .from('staff')
    .select('id, name, role, email, phone, is_verified')
    .eq('id', session.staffId)
    .single();

  if (staffErr || !staffData) throw new Error('Failed to load staff profile.');

  const { data: salonData, error: salonErr } = await supabase
    .from('salons')
    .select('name, working_hours, working_days, time_format')
    .eq('id', session.salonId)
    .single();

  if (salonErr || !salonData) throw new Error('Failed to load salon info.');

  const salon = salonData as Pick<SalonRow, 'name' | 'working_hours' | 'working_days' | 'time_format'>;

  return {
    ...(staffData as StaffProfileRow),
    salon: {
      name: salon.name,
      working_hours: salon.working_hours as { start: string; end: string },
      working_days: salon.working_days,
      time_format: (salon.time_format || '12h') as '12h' | '24h',
    },
  };
}

// ─────────────────────────────────────────────
// updateStaffProfile
// Staff can update their own name and email.
// ─────────────────────────────────────────────

export async function updateStaffProfile(
  slug: string,
  input: { name: string; email?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  if (!input.name.trim()) return { ok: false, error: 'Name is required.' };

  const session = await requireStaffAuth(slug);
  const supabase = createServiceSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('staff')
    .update({
      name: input.name.trim(),
      email: input.email ?? null,
    })
    .eq('id', session.staffId);

  if (error) return { ok: false, error: `Failed to update profile: ${error.message}` };

  revalidatePath('/[slug]/staff/settings', 'page');
  return { ok: true };
}

// ─────────────────────────────────────────────
// changeStaffPassword
// Staff can change their own password.
// ─────────────────────────────────────────────

export async function changeStaffPassword(
  slug: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  // Validate new password strength
  const pwCheck = validateStaffPassword(newPassword);
  if (!pwCheck.valid) return { ok: false, error: pwCheck.error };

  const session = await requireStaffAuth(slug);
  const supabase = createServiceSupabaseClient();

  // Fetch current password hash
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: fetchErr } = await (supabase as any)
    .from('staff')
    .select('password_hash, session_version')
    .eq('id', session.staffId)
    .single();

  if (fetchErr || !data?.password_hash) {
    return { ok: false, error: 'Failed to verify current password.' };
  }

  // Verify current password
  const isValid = await verifyStaffPassword(currentPassword, data.password_hash);
  if (!isValid) return { ok: false, error: 'Current password is incorrect.' };

  // Hash and update new password, increment session_version to invalidate other sessions
  const passwordHash = await hashStaffPassword(newPassword);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (supabase as any)
    .from('staff')
    .update({
      password_hash: passwordHash,
      password_set_at: new Date().toISOString(),
      session_version: data.session_version + 1,
    })
    .eq('id', session.staffId);

  if (updateErr) return { ok: false, error: `Failed to update password: ${updateErr.message}` };

  return { ok: true };
}

