'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Users,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OwnerNavProps {
  slug: string;
}

export function OwnerSidebarNav({ slug }: OwnerNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: `/${slug}/dashboard`,    label: 'Dashboard',    Icon: LayoutDashboard },
    { href: `/${slug}/calendar`,     label: 'Calendar',     Icon: CalendarDays },
    { href: `/${slug}/appointments`, label: 'Appointments', Icon: CalendarRange },
    { href: `/${slug}/clients`,      label: 'Clients',      Icon: Users },
    { href: `/${slug}/settings`,     label: 'Settings',     Icon: Settings },
  ];

  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-3">
      {navItems.map(({ href, label, Icon }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground font-medium'
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function OwnerMobileNav({ slug }: OwnerNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: `/${slug}/dashboard`,    label: 'Dashboard',    Icon: LayoutDashboard },
    { href: `/${slug}/calendar`,     label: 'Calendar',     Icon: CalendarDays },
    { href: `/${slug}/appointments`, label: 'Appointments', Icon: CalendarRange },
    { href: `/${slug}/clients`,      label: 'Clients',      Icon: Users },
    { href: `/${slug}/settings`,     label: 'Settings',     Icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-border bg-background/95 backdrop-blur">
      {navItems.map(({ href, label, Icon }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors focus-visible:outline-none',
              isActive
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className={cn('size-4', isActive && 'text-primary')} />
            <span className="text-[9px]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
