'use server';

import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { generateOtp, storeOtp, verifyStoredOtp } from '@/lib/otp';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import {
  hashStaffPassword,
  verifyStaffPassword,
  validateStaffPassword,
  signStaffSession,
  setStaffSessionCookie,
  clearStaffSessionCookie,
} from '@/lib/staff-session';
import type { SalonRow } from '@/lib/supabase/types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type StaffLoginState = 'first_login' | 'returning' | 'not_found';

type StaffRow = {
  id: string;
  salon_id: string;
  name: string;
  phone: string;
  role: string | null;
  email: string | null;
  password_hash: string | null;
  is_verified: boolean;
  session_version: number;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function clean10DigitPhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(-10);
}

async function getSalonBySlug(slug: string): Promise<SalonRow | null> {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('salons')
    .select('*')
    .eq('slug', slug)
    .single();
  return data as SalonRow | null;
}

async function getStaffByPhone(salonId: string, phone: string): Promise<StaffRow | null> {
  const cleanPhone = clean10DigitPhone(phone);
  const supabase = createServiceSupabaseClient();
  const { data, error } = await (supabase as any)
    .from('staff')
    .select('id, salon_id, name, phone, role, email, password_hash, is_verified, session_version')
    .eq('salon_id', salonId)
    .eq('phone', cleanPhone)
    .maybeSingle();

  if (error) {
    console.error(`[getStaffByPhone] Supabase error for phone "${cleanPhone}" at salonId "${salonId}":`, error);
    return null;
  }
  return data as StaffRow | null;
}

// ─────────────────────────────────────────────
// checkStaffPhone
// Step 1 of the smart login flow:
// Returns whether this is a first login, returning staff, or unknown number.
// ─────────────────────────────────────────────

export async function checkStaffPhone(
  slug: string,
  phone: string
): Promise<{ ok: boolean; state?: StaffLoginState; name?: string; error?: string }> {
  const cleanPhone = clean10DigitPhone(phone);
  if (cleanPhone.length !== 10) {
    return { ok: false, error: 'Please enter a valid 10-digit mobile number.' };
  }

  const salon = await getSalonBySlug(slug);
  if (!salon) return { ok: false, error: 'Salon not found.' };

  const staff = await getStaffByPhone(salon.id, cleanPhone);
  if (!staff) {
    console.log(`[checkStaffPhone] No staff found for phone "${cleanPhone}" in salon "${salon.name}" (${slug})`);
    return { ok: true, state: 'not_found' };
  }

  // First login: added by owner but hasn't set a password yet, or hasn't verified WhatsApp
  const isFirstLogin = !staff.is_verified || !staff.password_hash;
  return {
    ok: true,
    state: isFirstLogin ? 'first_login' : 'returning',
    name: staff.name,
  };
}

// ─────────────────────────────────────────────
// requestStaffOtp
// Sends WhatsApp OTP for activation or forgot-password flow.
// ─────────────────────────────────────────────

export async function requestStaffOtp(
  slug: string,
  phone: string,
  reason: 'activate' | 'forgot_password'
): Promise<{ ok: boolean; error?: string }> {
  const cleanPhone = clean10DigitPhone(phone);
  if (cleanPhone.length !== 10) {
    return { ok: false, error: 'Please enter a valid 10-digit mobile number.' };
  }

  const salon = await getSalonBySlug(slug);
  if (!salon) return { ok: false, error: 'Salon not found.' };

  const staff = await getStaffByPhone(salon.id, cleanPhone);
  if (!staff) return { ok: false, error: 'Phone number not registered for this salon.' };

  if (reason === 'forgot_password' && !staff.is_verified) {
    return { ok: false, error: 'Account not yet activated. Please complete first-time setup.' };
  }

  const code = generateOtp();

  try {
    await storeOtp(salon.id, cleanPhone, code);
  } catch {
    return { ok: false, error: 'Failed to generate OTP. Please try again.' };
  }

  // Log OTP to terminal logs for testing
  console.log('========================================');
  console.log(`[TESTING] Staff OTP for ${cleanPhone} at ${slug} (${reason}): ${code}`);
  console.log('========================================');

  /* TEMPORARILY COMMENTED FOR TESTING — UNCOMMENT FOR PRODUCTION:
  const waPhone = `91${cleanPhone}`;
  const { success, error: waError } = await sendWhatsAppMessage(
    waPhone,
    'costumer_auth', // Reuse existing approved WhatsApp auth template
    'en',
    [code],
    salon.id
  );

  if (!success) {
    console.warn(`[OTP FALLBACK] Staff WhatsApp failed for ${cleanPhone} at ${slug}: ${waError}`);
    console.warn(`[OTP FALLBACK] Code: ${code}`);
  }
  */

  return { ok: true };
}

// ─────────────────────────────────────────────
// verifyStaffOtpAndSetPassword
// Verifies OTP and sets or resets the staff password.
// ─────────────────────────────────────────────

export async function verifyStaffOtpAndSetPassword(
  slug: string,
  phone: string,
  otp: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const cleanPhone = clean10DigitPhone(phone);
  if (cleanPhone.length !== 10) {
    return { ok: false, error: 'Please enter a valid 10-digit mobile number.' };
  }

  // Validate password strength
  const pwCheck = validateStaffPassword(newPassword);
  if (!pwCheck.valid) return { ok: false, error: pwCheck.error };

  const salon = await getSalonBySlug(slug);
  if (!salon) return { ok: false, error: 'Salon not found.' };

  const staff = await getStaffByPhone(salon.id, cleanPhone);
  if (!staff) return { ok: false, error: 'Staff not found.' };

  // Verify OTP
  let valid: boolean;
  try {
    valid = await verifyStoredOtp(salon.id, cleanPhone, otp);
  } catch {
    return { ok: false, error: 'Verification failed. Please try again.' };
  }

  if (!valid) return { ok: false, error: 'Invalid or expired OTP.' };

  // Hash the new password
  const passwordHash = await hashStaffPassword(newPassword);

  // Update staff: set password, mark verified, increment session_version (invalidate old sessions)
  const supabase = createServiceSupabaseClient();
  const { error: updateError } = await (supabase as any)
    .from('staff')
    .update({
      password_hash: passwordHash,
      is_verified: true,
      password_set_at: new Date().toISOString(),
      session_version: staff.session_version + 1,
    })
    .eq('id', staff.id);

  if (updateError) {
    return { ok: false, error: 'Failed to set password. Please try again.' };
  }

  // Issue a new session cookie
  const token = await signStaffSession({
    staffId: staff.id,
    salonId: salon.id,
    salonSlug: slug,
    phone: cleanPhone,
    sessionVersion: staff.session_version + 1,
  });

  await setStaffSessionCookie(token, slug);

  return { ok: true };
}

// ─────────────────────────────────────────────
// loginStaffWithPassword
// Normal returning staff login.
// ─────────────────────────────────────────────

export async function loginStaffWithPassword(
  slug: string,
  phone: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const cleanPhone = clean10DigitPhone(phone);
  if (cleanPhone.length !== 10) {
    return { ok: false, error: 'Please enter a valid 10-digit mobile number.' };
  }

  const salon = await getSalonBySlug(slug);
  if (!salon) return { ok: false, error: 'Salon not found.' };

  const staff = await getStaffByPhone(salon.id, cleanPhone);
  // Generic error to prevent user enumeration
  if (!staff || !staff.password_hash || !staff.is_verified) {
    return { ok: false, error: 'Invalid phone number or password.' };
  }

  let passwordValid: boolean;
  try {
    passwordValid = await verifyStaffPassword(password, staff.password_hash);
  } catch {
    return { ok: false, error: 'Login failed. Please try again.' };
  }

  if (!passwordValid) {
    return { ok: false, error: 'Invalid phone number or password.' };
  }

  // Issue a session cookie
  const token = await signStaffSession({
    staffId: staff.id,
    salonId: salon.id,
    salonSlug: slug,
    phone: cleanPhone,
    sessionVersion: staff.session_version,
  });

  await setStaffSessionCookie(token, slug);

  return { ok: true };
}

// ─────────────────────────────────────────────
// logoutStaff
// ─────────────────────────────────────────────

export async function logoutStaff(slug: string): Promise<void> {
  await clearStaffSessionCookie(slug);
}

