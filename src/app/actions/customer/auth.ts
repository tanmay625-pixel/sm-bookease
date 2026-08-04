'use server';

import { cookies } from 'next/headers';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { generateOtp, storeOtp, verifyStoredOtp, signSessionCookie } from '@/lib/otp';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import type { SalonRow } from '@/lib/supabase/types';

const SESSION_COOKIE_NAME = 'bookease_session';
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// ─────────────────────────────────────────────
// requestOtp
// Looks up the salon by slug, generates a 6-digit OTP, stores the hash,
// and sends it via WhatsApp.
// ─────────────────────────────────────────────

export async function requestOtp(
  salonSlug: string,
  phone: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceSupabaseClient();

  // Look up salon by slug
  const { data: salonData, error: salonError } = await supabase
    .from('salons')
    .select('id, name')
    .eq('slug', salonSlug)
    .single();
  const salon = salonData as SalonRow | null;

  if (salonError || !salon) {
    return { ok: false, error: 'Salon not found' };
  }

  const code = generateOtp();

  try {
    await storeOtp(salon.id, phone, code);
  } catch {
    return { ok: false, error: 'Failed to store OTP — please try again' };
  }

  // Dev fallback: log OTP to console so the flow is testable before WhatsApp
  // template approval. Guarded by NODE_ENV so this never leaks in production.
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${phone} at ${salonSlug}: ${code}`);
  }

  // TODO: confirm exact template name once approved by Meta
  const { success, error: waError } = await sendWhatsAppMessage(
    phone,
    'bookease_otp', // TODO: confirm exact template name once approved
    'en',
    [code],
    salon.id
  );

  if (!success) {
    // In development, don't fail the flow even if WhatsApp isn't wired
    if (process.env.NODE_ENV === 'development') {
      console.warn('[DEV] WhatsApp send skipped:', waError);
      return { ok: true };
    }
    return { ok: false, error: 'Failed to send OTP — please try again' };
  }

  return { ok: true };
}

// ─────────────────────────────────────────────
// verifyOtp
// Validates the OTP against the stored hash, deletes the row on success,
// and sets the signed httpOnly session cookie.
// ─────────────────────────────────────────────

export async function verifyOtp(
  salonSlug: string,
  phone: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceSupabaseClient();

  const { data: salonData } = await supabase
    .from('salons')
    .select('id')
    .eq('slug', salonSlug)
    .single();
  const salon = salonData as SalonRow | null;

  if (!salon) return { ok: false, error: 'Salon not found' };

  // verifyStoredOtp can throw if Supabase is unreachable
  let valid: boolean;
  try {
    valid = await verifyStoredOtp(salon.id, phone, code);
  } catch {
    return { ok: false, error: 'Verification failed — please try again' };
  }

  if (!valid) return { ok: false, error: 'Invalid or expired code' };

  // signSessionCookie uses jose which can throw DOMException for key issues.
  // cookieStore.set can throw in some Next.js execution contexts.
  // Neither must escape the server action boundary — wrap both.
  try {
    const token = await signSessionCookie(salon.id, phone);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: `/${salonSlug}`, // scope to this salon's path tree
    });
  } catch (err) {
    console.error('[verifyOtp] Failed to sign or set session cookie:', err);
    return { ok: false, error: 'Failed to create session — please try again' };
  }

  return { ok: true };
}
