'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { logoutStaff } from '@/app/actions/staff/auth';
import { LogOut } from 'lucide-react';

export function StaffLogoutButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logoutStaff(slug);
      router.push(`/${slug}/staff/login`);
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleLogout}
      disabled={isPending}
      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      title="Sign out"
    >
      <LogOut className="size-4" />
      <span className="sr-only">Sign out</span>
    </Button>
  );
}

