'use client';

import * as React from 'react';
import type { ServiceRow } from '@/lib/supabase/types';
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';

export interface ServiceComboboxProps {
  services: ServiceRow[];
  selectedServiceIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  container?: HTMLElement | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ServiceCombobox({
  services,
  selectedServiceIds,
  onSelectionChange,
  container,
  placeholder = 'Search services…',
  className,
  disabled = false,
}: ServiceComboboxProps) {
  const anchorRef = useComboboxAnchor();

  return (
    <Combobox
      multiple
      value={selectedServiceIds}
      onValueChange={(newValue) => onSelectionChange(newValue as string[])}
      itemToStringLabel={(id) => services.find((s) => s.id === id)?.name ?? ''}
      items={services.map((s) => s.id)}
      disabled={disabled}
    >
      <ComboboxChips ref={anchorRef} className={className}>
        <ComboboxValue>
          {(values: string[]) => (
            <>
              {values.map((id) => {
                const svc = services.find((s) => s.id === id);
                return svc ? (
                  <ComboboxChip key={id}>
                    {svc.name}
                  </ComboboxChip>
                ) : null;
              })}
              <ComboboxChipsInput
                placeholder={values.length > 0 ? '' : placeholder}
                disabled={disabled}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef} container={container}>
        <ComboboxList>
          {(id: string) => {
            const svc = services.find((s) => s.id === id);
            return svc ? (
              <ComboboxItem key={id} value={id}>
                <span className="flex-1">{svc.name}</span>
                <span className="tabular-nums text-muted-foreground ml-auto mr-5">
                  {svc.duration_minutes}m · ₹{svc.price}
                </span>
              </ComboboxItem>
            ) : null;
          }}
        </ComboboxList>
        <ComboboxEmpty>No services found</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
