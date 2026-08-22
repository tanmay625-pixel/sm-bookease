'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { StaffRow } from '@/lib/supabase/types';
import { Search, X } from 'lucide-react';

interface FilterBarProps {
  staff: StaffRow[];
}

export function FilterBar({ staff }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp]
  );

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    update('search', e.target.value);
  }

  function clearAll() {
    router.push(pathname);
  }

  const hasFilters = sp.toString().length > 0;

  // Date inputs: show as text+placeholder when empty, switch to date on focus
  const [fromType, setFromType] = useState<'text' | 'date'>(
    sp.get('dateFrom') ? 'date' : 'text'
  );
  const [toType, setToType] = useState<'text' | 'date'>(
    sp.get('dateTo') ? 'date' : 'text'
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative min-w-[180px] flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          id="appt-search"
          placeholder="Search client…"
          defaultValue={sp.get('search') ?? ''}
          onChange={handleSearch}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Date from — shows "From" placeholder when empty */}
      <Input
        id="appt-date-from"
        type={fromType}
        defaultValue={sp.get('dateFrom') ?? ''}
        onChange={(e) => {
          update('dateFrom', e.target.value);
          if (!e.target.value) setFromType('text');
        }}
        className="w-36 h-8 text-xs"
        placeholder="From"
        onFocus={() => setFromType('date')}
        onBlur={(e) => { if (!e.currentTarget.value) setFromType('text'); }}
      />

      {/* Date to — shows "To" placeholder when empty */}
      <Input
        id="appt-date-to"
        type={toType}
        defaultValue={sp.get('dateTo') ?? ''}
        onChange={(e) => {
          update('dateTo', e.target.value);
          if (!e.target.value) setToType('text');
        }}
        className="w-36 h-8 text-xs"
        placeholder="To"
        onFocus={() => setToType('date')}
        onBlur={(e) => { if (!e.currentTarget.value) setToType('text'); }}
      />

      {/* Status */}
      <Select
        defaultValue={sp.get('status') ?? 'all'}
        onValueChange={(v) => update('status', v)}
      >
        <SelectTrigger id="appt-status-filter" className="w-32 h-8 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {/* Staff */}
      <Select
        defaultValue={sp.get('staffId') ?? 'all'}
        onValueChange={(v) => update('staffId', v)}
      >
        <SelectTrigger id="appt-staff-filter" className="w-36 h-8 text-xs">
          <SelectValue placeholder="All staff" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All staff</SelectItem>
          {staff.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-8 gap-1 text-xs"
          id="appt-clear-filters"
        >
          <X className="size-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
