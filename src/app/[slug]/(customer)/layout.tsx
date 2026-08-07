import { cookies } from 'next/headers';
import { verifySessionCookie } from '@/lib/otp';
import { CustomerHeader } from '@/components/customer/customer-header';
import { CustomerBottomNav } from '@/components/customer/customer-bottom-nav';

/**
 * Customer route group layout.
 *
 * No Clerk — customers authenticate via phone + OTP only.
 * Renders a mobile header with phone & logout control, and active bottom navigation.
 */
export default async function CustomerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('bookease_session')?.value;
  const session = token ? await verifySessionCookie(token) : null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Mobile top bar */}
      <CustomerHeader slug={slug} phone={session?.phone} />

      {/* Page content */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom navigation */}
      <CustomerBottomNav slug={slug} />
    </div>
  );
}
