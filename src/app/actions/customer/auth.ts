'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { generateOtp, storeOtp, verifyStoredOtp, signSessionCookie, verifySessionCookie } from '@/lib/otp';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import type { SalonRow, CustomerRow } from '@/lib/supabase/types';

const SESSION_COOKIE_NAME = 'bookmi_session';
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
  // template approval.
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${phone} at ${salonSlug}: ${code}`);
  }

  // TODO: confirm exact template name once approved by Meta
  const { success, error: waError } = await sendWhatsAppMessage(
    phone,
    'bookmi_otp', // TODO: confirm exact template name once approved
    'en',
    [code],
    salon.id
  );

  if (!success) {
    // WhatsApp delivery failed — log OTP to server logs so the owner
    // can still test the flow while Meta verification is pending.
    // This log is only visible in Vercel Function Logs (server-side),
    // never exposed to the client.
    console.warn(`[OTP FALLBACK] WhatsApp failed for ${phone} at ${salonSlug}: ${waError}`);
    console.warn(`[OTP FALLBACK] Code: ${code}`);
  }

  return { ok: true };
}

// ─────────────────────────────────────────────
// verifyOtp
// Validates the OTP against the stored hash, deletes the row on success,
// sets the signed httpOnly session cookie, and determines if customer needs name.
// ─────────────────────────────────────────────

export async function verifyOtp(
  salonSlug: string,
  phone: string,
  code: string
): Promise<{ ok: boolean; needsName?: boolean; error?: string }> {
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

  // Check if customer record exists with an actual name (not empty and not the phone number)
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('name')
    .eq('salon_id', salon.id)
    .eq('phone', phone)
    .single();

  const customer = existingCustomer as Pick<CustomerRow, 'name'> | null;
  const hasRealName = Boolean(customer?.name && customer.name.trim() !== '' && customer.name.trim() !== phone);
  const needsName = !hasRealName;

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

  return { ok: true, needsName };
}

// ─────────────────────────────────────────────
// saveCustomerName
// Saves or updates the customer name for the currently authenticated session.
// ─────────────────────────────────────────────

export async function saveCustomerName(
  salonSlug: string,
  name: string,
  email?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: 'Please enter a valid name' };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return { ok: false, error: 'Not authenticated — please sign in' };
  }

  const session = await verifySessionCookie(token);
  if (!session) {
    return { ok: false, error: 'Session expired — please sign in again' };
  }

  const supabase = createServiceSupabaseClient();

  const { data: salonData } = await supabase
    .from('salons')
    .select('id')
    .eq('slug', salonSlug)
    .eq('id', session.salonId)
    .single();
  const salon = salonData as SalonRow | null;

  if (!salon) {
    return { ok: false, error: 'Salon not found' };
  }

  // Upsert customer with the provided name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('customers')
    .upsert(
      {
        salon_id: salon.id,
        phone: session.phone,
        name: trimmedName,
        email: email || null,
      },
      { onConflict: 'salon_id,phone' }
    );

  if (error) {
    return { ok: false, error: `Failed to save name: ${error.message}` };
  }

  return { ok: true };
}

// ─────────────────────────────────────────────
// customerLogout
// Clears the customer session cookie and revalidates customer pages.
// ─────────────────────────────────────────────

export async function customerLogout(
  salonSlug: string
): Promise<{ ok: boolean }> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: `/${salonSlug}`,
  });

  revalidatePath(`/${salonSlug}`, 'layout');
  return { ok: true };
}
