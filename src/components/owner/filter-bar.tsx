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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import type { StaffRow } from '@/lib/supabase/types';
import { Search, X, SlidersHorizontal } from 'lucide-react';

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

  const hasAdvancedFilters = !!(
    sp.get('dateFrom') || sp.get('dateTo') || sp.get('status') || sp.get('staffId')
  );
  const hasFilters = sp.toString().length > 0;

  const [fromType, setFromType] = useState<'text' | 'date'>(
    sp.get('dateFrom') ? 'date' : 'text'
  );
  const [toType, setToType] = useState<'text' | 'date'>(
    sp.get('dateTo') ? 'date' : 'text'
  );

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Search - always visible */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          id="appt-search"
          placeholder="Search client..."
          defaultValue={sp.get('search') ?? ''}
          onChange={handleSearch}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Desktop: inline filters */}
      <div className="hidden md:flex items-center gap-2 flex-wrap">
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

      {/* Mobile: filter icon + dialog */}
      <div className="flex md:hidden items-center gap-1">
        {hasFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearAll}
            className="h-8 w-8 text-destructive hover:text-destructive"
            id="appt-clear-filters-mobile"
          >
            <X className="size-4" />
            <span className="sr-only">Clear filters</span>
          </Button>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative h-8 w-8 shrink-0"
              id="appt-filter-trigger-mobile"
            >
              <SlidersHorizontal className="size-4" />
              {hasAdvancedFilters && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
              )}
              <span className="sr-only">Open filters</span>
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Filters</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-3 py-1">
              <div className="flex gap-2">
                <Input
                  id="appt-date-from-mobile"
                  type={fromType}
                  defaultValue={sp.get('dateFrom') ?? ''}
                  onChange={(e) => {
                    update('dateFrom', e.target.value);
                    if (!e.target.value) setFromType('text');
                  }}
                  className="flex-1 h-9 text-sm"
                  placeholder="From"
                  onFocus={() => setFromType('date')}
                  onBlur={(e) => { if (!e.currentTarget.value) setFromType('text'); }}
                />
                <Input
                  id="appt-date-to-mobile"
                  type={toType}
                  defaultValue={sp.get('dateTo') ?? ''}
                  onChange={(e) => {
                    update('dateTo', e.target.value);
                    if (!e.target.value) setToType('text');
                  }}
                  className="flex-1 h-9 text-sm"
                  placeholder="To"
                  onFocus={() => setToType('date')}
                  onBlur={(e) => { if (!e.currentTarget.value) setToType('text'); }}
                />
              </div>

              <Select
                defaultValue={sp.get('status') ?? 'all'}
                onValueChange={(v) => update('status', v)}
              >
                <SelectTrigger id="appt-status-filter-mobile" className="w-full h-9 text-sm">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select
                defaultValue={sp.get('staffId') ?? 'all'}
                onValueChange={(v) => update('staffId', v)}
              >
                <SelectTrigger id="appt-staff-filter-mobile" className="w-full h-9 text-sm">
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
            </div>

            <DialogFooter>
              {hasAdvancedFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  className="gap-1 text-xs text-destructive hover:text-destructive border-destructive/40 mr-auto"
                >
                  <X className="size-3" />
                  Clear all
                </Button>
              )}
              <DialogClose asChild>
                <Button size="sm">Done</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}