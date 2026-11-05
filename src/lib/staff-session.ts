import 'server-only';
import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const _rawSecret = process.env.STAFF_SESSION_SECRET ?? process.env.CUSTOMER_SESSION_SECRET;
if (!_rawSecret) {
  throw new Error(
    '[staff-session.ts] STAFF_SESSION_SECRET (or CUSTOMER_SESSION_SECRET) is not set. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"'
  );
}

const SESSION_SECRET = new TextEncoder().encode(_rawSecret + ':staff');
const SESSION_TTL_DAYS = 7;
export const STAFF_SESSION_COOKIE = 'bookmi_staff_session';

// ─────────────────────────────────────────────
// Password utilities
// ─────────────────────────────────────────────

/**
 * Password policy:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 */
export function validateStaffPassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number.' };
  }
  return { valid: true };
}

/**
 * Hashes a password using PBKDF2-SHA256 with a random salt.
 * Returns "salt:hash" string stored in DB.
 */
export async function hashStaffPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await new Promise<string>((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100_000, 64, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored "salt:hash" string.
 */
export async function verifyStaffPassword(password: string, stored: string): Promise<boolean> {
  const [salt, storedHash] = stored.split(':');
  if (!salt || !storedHash) return false;
  const hash = await new Promise<string>((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100_000, 64, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// ─────────────────────────────────────────────
// JWT Session
// ─────────────────────────────────────────────

export type StaffSessionPayload = {
  staffId: string;
  salonId: string;
  salonSlug: string;
  phone: string;
  sessionVersion: number;
};

/**
 * Signs a 7-day staff session JWT.
 */
export async function signStaffSession(payload: StaffSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(SESSION_SECRET);
}

/**
 * Verifies a staff session JWT.
 * Returns the payload on success, null on any failure (expired, invalid, etc.).
 */
export async function verifyStaffSession(token: string): Promise<StaffSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    const { staffId, salonId, salonSlug, phone, sessionVersion } = payload as Record<string, unknown>;
    if (
      typeof staffId !== 'string' ||
      typeof salonId !== 'string' ||
      typeof salonSlug !== 'string' ||
      typeof phone !== 'string' ||
      typeof sessionVersion !== 'number'
    ) return null;
    return { staffId, salonId, salonSlug, phone, sessionVersion };
  } catch {
    return null;
  }
}

/**
 * Reads and validates the staff session cookie from the current request.
 * Also validates the session_version against the DB (to detect invalidated sessions).
 * Returns null if the session is missing, expired, or invalid.
 */
export async function getStaffSession(expectedSlug?: string): Promise<StaffSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyStaffSession(token);
  if (!payload) return null;

  // Slug must match the requested salon
  if (expectedSlug && payload.salonSlug !== expectedSlug) return null;

  // Verify session_version matches DB (invalidated if owner changed phone)
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('staff')
    .select('id, session_version')
    .eq('id', payload.staffId)
    .single();

  const staffRow = data as { id: string; session_version: number } | null;
  if (!staffRow || staffRow.session_version !== payload.sessionVersion) return null;

  return payload;
}

/**
 * Like getStaffSession but redirects to login if no valid session.
 * Use in layouts and pages to protect routes.
 */
export async function requireStaffSession(slug: string): Promise<StaffSessionPayload> {
  const session = await getStaffSession(slug);
  if (!session) {
    redirect(`/${slug}/staff/login`);
  }
  return session;
}

/**
 * Sets the staff session cookie.
 */
export async function setStaffSessionCookie(token: string, slug: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/${slug}/staff`,
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

/**
 * Clears the staff session cookie.
 */
export async function clearStaffSessionCookie(slug: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(STAFF_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/${slug}/staff`,
    maxAge: 0,
  });
}

