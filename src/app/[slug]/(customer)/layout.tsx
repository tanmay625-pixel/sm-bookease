import { cookies } from 'next/headers';
import { verifySessionCookie } from '@/lib/otp';

/**
 * Customer route group layout.
 *
 * No Clerk — customers authenticate via phone + OTP only.
 * This layout doesn't gate access; individual pages that require a
 * session will call requireCustomerSession() inside their server actions.
 *
 * The layout exists as a grouping boundary and could pass salon context
 * as a React context provider once the v0 UI layer arrives.
 */
export default async function CustomerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  // params is a Promise in Next.js 16
  void params; // slug is used by child pages via their own params

  // Optionally read the session cookie here to pass customer info to children
  // via a context provider — for now, just render children.
  const cookieStore = await cookies();
  const token = cookieStore.get('bookease_session')?.value;
  const session = token ? await verifySessionCookie(token) : null;

  // session is available here if needed for layout-level UI (e.g. "signed in as X")
  void session;

  return <>{children}</>;
}
