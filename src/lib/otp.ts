import 'server-only';
import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.CUSTOMER_SESSION_SECRET!
);
const SESSION_TTL_DAYS = 7;
const OTP_TTL_MINUTES = 10;

// ─────────────────────────────────────────────
// OTP generation & persistence
// ─────────────────────────────────────────────

/** Generates a cryptographically random 6-digit OTP string. */
export function generateOtp(): string {
  return crypto.randomInt(100_000, 999_999).toString();
}

/**
 * SHA-256 hex digest of the OTP code.
 * Sufficient for a short-lived 6-digit code — goal is not leaving
 * plaintext OTPs readable in a DB dump or logs.
 */
function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Stores a hashed OTP in the `otp_codes` table via the service-role client.
 * Deletes any prior codes for the same (salon_id, phone) before inserting,
 * so there is at most one active OTP per phone per salon at any time.
 */
export async function storeOtp(
  salonId: string,
  phone: string,
  code: string
): Promise<void> {
  const supabase = createServiceSupabaseClient();

  // Delete any existing codes for this (salon, phone) — avoids accumulation
  await supabase
    .from('otp_codes')
    .delete()
    .eq('salon_id', salonId)
    .eq('phone', phone);

  const expiresAt = new Date(
    Date.now() + OTP_TTL_MINUTES * 60 * 1_000
  ).toISOString();

  const { error } = await supabase.from('otp_codes').insert({
    salon_id: salonId,
    phone,
    code_hash: hashOtp(code),
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(`Failed to store OTP: ${error.message}`);
  }
}

/**
 * Verifies an OTP against the stored hash for (salon_id, phone).
 * - Returns false if no unexpired record exists or the hash doesn't match.
 * - Deletes the row on success (single-use; prevents replay attacks).
 */
export async function verifyStoredOtp(
  salonId: string,
  phone: string,
  code: string
): Promise<boolean> {
  const supabase = createServiceSupabaseClient();

  const { data } = await supabase
    .from('otp_codes')
    .select('id, code_hash, expires_at')
    .eq('salon_id', salonId)
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return false;

  // Check expiry
  if (new Date(data.expires_at) < new Date()) return false;

  // Constant-time comparison isn't strictly necessary for a hash but
  // hash comparison is already brute-force-resistant for a 6-digit code.
  const valid = data.code_hash === hashOtp(code);

  if (valid) {
    // Delete on success — single use
    await supabase.from('otp_codes').delete().eq('id', data.id);
  }

  return valid;
}

// ─────────────────────────────────────────────
// Customer session cookie (signed JWT)
// ─────────────────────────────────────────────

export type CustomerSessionPayload = {
  salonId: string;
  phone: string;
};

/**
 * Signs a 7-day HMAC-SHA256 JWT for the customer session.
 * Stored as an httpOnly cookie scoped to the salon slug path.
 */
export async function signSessionCookie(
  salonId: string,
  phone: string
): Promise<string> {
  return new SignJWT({ salonId, phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(SESSION_SECRET);
}

/**
 * Verifies a customer session JWT.
 * Returns the payload on success, null on any failure (expired, invalid, etc.).
 */
export async function verifySessionCookie(
  token: string
): Promise<CustomerSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    const { salonId, phone } = payload as Record<string, unknown>;
    if (typeof salonId !== 'string' || typeof phone !== 'string') return null;
    return { salonId, phone };
  } catch {
    return null;
  }
}
