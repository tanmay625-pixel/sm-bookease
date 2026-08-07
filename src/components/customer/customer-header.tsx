'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Scissors, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { customerLogout } from '@/app/actions/customer/auth';
import Link from 'next/link';

interface CustomerHeaderProps {
  slug: string;
  phone?: string | null;
}

export function CustomerHeader({ slug, phone }: CustomerHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await customerLogout(slug);
      router.push(`/${slug}/book`);
      router.refresh();
    });
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 py-3">
      <Link href={`/${slug}/book`} className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Scissors className="size-3.5" />
        </div>
        <span className="text-sm font-semibold text-foreground">BookEase</span>
      </Link>

      {phone ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
            {phone}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isPending}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline text-[11px]">Sign out</span>
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" asChild className="h-7 px-2.5 text-xs">
          <Link href={`/${slug}/sign-in`}>Sign in</Link>
        </Button>
      )}
    </header>
  );
}
