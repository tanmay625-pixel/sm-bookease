"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  Home01Icon,
  Calendar03Icon,
  UserMultipleIcon,
  Calendar01Icon,
  Settings02Icon,
  Menu01Icon,
  Cancel01Icon,
  Logout01Icon,
  Scissor01Icon,
} from "@hugeicons/core-free-icons";

type NavItem = { label: string; href: string; icon: typeof Home01Icon };

function useNav(slug: string): NavItem[] {
  return [
    { label: "Dashboard", href: `/${slug}/dashboard`, icon: Home01Icon },
    { label: "Appointments", href: `/${slug}/appointments`, icon: Calendar03Icon },
    { label: "Clients", href: `/${slug}/clients`, icon: UserMultipleIcon },
    { label: "Calendar", href: `/${slug}/calendar`, icon: Calendar01Icon },
    { label: "Settings", href: `/${slug}/settings`, icon: Settings02Icon },
  ];
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon icon={item.icon} size={20} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ salonName }: { salonName: string }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
        <Icon icon={Scissor01Icon} size={20} />
      </span>
      <div className="min-w-0">
        <p className="font-heading text-lg leading-tight text-sidebar-foreground">BookEase</p>
        <p className="truncate text-xs text-sidebar-foreground/60">{salonName}</p>
      </div>
    </div>
  );
}

export function OwnerShell({
  slug,
  salonName,
  children,
}: {
  slug: string;
  salonName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = useNav(slug);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col justify-between bg-sidebar px-4 py-6 lg:flex">
        <div className="flex flex-col gap-8">
          <Brand salonName={salonName} />
          <NavLinks items={items} pathname={pathname} />
        </div>
        <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Icon icon={Logout01Icon} size={20} />
          Sign out
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 lg:hidden">
        <Brand salonName={salonName} />
        <button
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
          className="rounded-xl p-2 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Icon icon={Menu01Icon} size={24} />
        </button>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-[#2a2622]/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col justify-between bg-sidebar px-4 py-6">
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <Brand salonName={salonName} />
                <button
                  aria-label="Close menu"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl p-2 text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <Icon icon={Cancel01Icon} size={22} />
                </button>
              </div>
              <NavLinks items={items} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 pt-16 lg:ml-64 lg:pt-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
