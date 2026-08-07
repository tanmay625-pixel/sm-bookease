'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerBottomNavProps {
  slug: string;
}

export function CustomerBottomNav({ slug }: CustomerBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: `/${slug}/book`,    label: 'Book',    Icon: CalendarCheck },
    { href: `/${slug}/history`, label: 'History', Icon: History },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-background/95 backdrop-blur">
      {navItems.map(({ href, label, Icon }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-3 transition-colors focus-visible:outline-none',
              isActive
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className={cn('size-5', isActive && 'text-primary')} />
            <span className="text-[10px]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
