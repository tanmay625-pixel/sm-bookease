import { redirect } from 'next/navigation';
import { getCachedOwnerSalon, getCachedAuth } from '@/lib/supabase/cached';
import { UserButton } from '@clerk/nextjs';
import { OwnerSidebarNav, OwnerMobileNav } from '@/components/owner/owner-nav';
import { Scissors } from 'lucide-react';
import { ModeToggle } from '@/components/ui/theme-toggle';

/**
 * Owner route group layout.
 * Two-step protection:
 * 1. Confirms the request has an active Clerk session (→ /sign-in if not)
 * 2. Confirms the authenticated Clerk user owns the salon with this slug
 *    (→ / if not)
 *
 * Uses getCachedOwnerSalon() (React.cache) so any child page or server
 * action called during this render tree that also calls getCachedOwnerSalon()
 * receives the memoised result — eliminating N+1 Supabase round-trips.
 *
 * params is a Promise in Next.js 16 — always await it.
 */
export default async function OwnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Auth check first — fast path before any DB work.
  const { userId } = await getCachedAuth();
  if (!userId) {
    redirect('/sign-in');
  }

  // Ownership check — result is memoised for child pages in this render.
  const salon = await getCachedOwnerSalon(slug);

  if (!salon) {
    redirect('/');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar (desktop) ─────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-sidebar">
        {/* Logo / salon name */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Scissors className="size-4" />
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground truncate">
            {salon.name}
          </span>
        </div>

        {/* Dynamic Nav items with active tab state */}
        <OwnerSidebarNav slug={slug} />

        {/* User button & theme toggle */}
        <div className="flex items-center justify-between border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <UserButton />
            <span className="text-xs text-sidebar-foreground truncate">My account</span>
          </div>
          <ModeToggle />
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-40 flex md:hidden items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scissors className="size-3.5" />
          </div>
          <span className="text-sm font-semibold truncate max-w-[160px]">{salon.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserButton />
        </div>
      </div>

      {/* ── Mobile bottom nav with active tab state ─────── */}
      <OwnerMobileNav slug={slug} />

      {/* ── Main content ─────────────────────────────────── */}
      <main className="flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  );
}
