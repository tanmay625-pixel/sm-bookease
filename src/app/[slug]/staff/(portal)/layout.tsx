import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/staff-session';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { StaffSidebarNav, StaffMobileNav } from '@/components/staff/staff-nav';
import { StaffLogoutButton } from '@/components/staff/staff-logout-button';
import { Scissors } from 'lucide-react';
import { ModeToggle } from '@/components/ui/theme-toggle';
import type { SalonRow } from '@/lib/supabase/types';

/**
 * Staff route group layout.
 * Requires a valid staff session for the requested salon slug.
 */
export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Auth check — redirects to /[slug]/staff/login if no valid session
  const session = await requireStaffSession(slug);

  // Fetch salon name for the sidebar header
  const supabase = createServiceSupabaseClient();
  const { data: salonData } = await supabase
    .from('salons')
    .select('name')
    .eq('id', session.salonId)
    .single();
  const salon = salonData as Pick<SalonRow, 'name'> | null;

  // Fetch staff name for the bottom bar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staffData } = await (supabase as any)
    .from('staff')
    .select('name, role')
    .eq('id', session.staffId)
    .single();
  const staff = staffData as { name: string; role: string | null } | null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar (desktop) ─────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-sidebar">
        {/* Logo / salon name + staff badge */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Scissors className="size-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">
              {salon?.name ?? slug}
            </span>
            <span className="text-[10px] text-sidebar-foreground/60 font-medium">Staff Portal</span>
          </div>
        </div>

        {/* Nav items */}
        <StaffSidebarNav slug={slug} />

        {/* Staff info + logout */}
        <div className="flex items-center justify-between border-t border-sidebar-border px-4 py-3 gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-sidebar-foreground truncate">
              {staff?.name ?? 'Staff'}
            </span>
            {staff?.role && (
              <span className="text-[10px] text-sidebar-foreground/60 truncate">{staff.role}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ModeToggle />
            <StaffLogoutButton slug={slug} />
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-40 flex md:hidden items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scissors className="size-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold truncate max-w-[140px]">
              {salon?.name ?? slug}
            </span>
            <span className="text-[9px] text-muted-foreground">Staff Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <StaffLogoutButton slug={slug} />
        </div>
      </div>

      {/* ── Mobile bottom nav ─────── */}
      <StaffMobileNav slug={slug} />

      {/* ── Main content ─────────────────────────────────── */}
      <main className="flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  );
}

