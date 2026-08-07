'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export function ClientsSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams();
    if (e.target.value) params.set('search', e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <Input
        id="clients-search"
        placeholder="Search by name or phone…"
        defaultValue={defaultValue ?? ''}
        onChange={handleChange}
        className="pl-8 h-8 text-xs"
      />
    </div>
  );
}
