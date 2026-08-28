'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper functions for time processing
/**
 * Parse flexible time input into HH:MM (24h).
 * When minTime/maxTime are provided, ambiguous 1-12 hour inputs (no am/pm
 * explicitly typed) are resolved by checking which candidate (AM or PM)
 * falls within the working-hours window.
 */
function parseTimeToHHMM(
  input: string,
  minTime?: string,
  maxTime?: string,
): string | null {
  const normalized = input.toLowerCase().trim();
  if (!normalized) return null;

  const userSaidPM = /p(m?)/i.test(normalized);
  const userSaidAM = /a(m?)/i.test(normalized);
  const hasExplicitMeridiem = userSaidPM || userSaidAM;

  // ── Colon format: "9:30", "09:30", "14:00", "2:35 pm" ──────────────────
  if (normalized.includes(':')) {
    const parts = normalized.split(':');
    if (parts.length === 2) {
      let h = parseInt(parts[0].replace(/[^0-9]/g, ''), 10);
      const mStr = parts[1].replace(/[^0-9]/g, '');
      let m = mStr ? parseInt(mStr, 10) : 0;
      if (isNaN(h)) return null;

      if (userSaidPM && h < 12) h += 12;
      else if (userSaidAM && h === 12) h = 0;
      else if (!hasExplicitMeridiem && h >= 1 && h <= 12) {
        // Colon format but no meridiem — apply same inference
        h = inferMeridiem(h, m, minTime, maxTime);
      }

      if (h < 0 || h > 23 || m < 0 || m > 59) return null;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  // ── Digit-only formats ───────────────────────────────────────────────────
  const numbersOnly = normalized.replace(/[^0-9]/g, '');
  if (!numbersOnly) return null;

  let hours = 0;
  let minutes = 0;

  if (numbersOnly.length <= 2) {
    hours = parseInt(numbersOnly, 10);
  } else if (numbersOnly.length === 3) {
    hours = parseInt(numbersOnly.slice(0, 1), 10);
    minutes = parseInt(numbersOnly.slice(1), 10);
  } else if (numbersOnly.length === 4) {
    hours = parseInt(numbersOnly.slice(0, 2), 10);
    minutes = parseInt(numbersOnly.slice(2, 4), 10);
  } else {
    return null;
  }

  // Explicit meridiem wins
  if (userSaidPM && hours < 12) {
    hours += 12;
  } else if (userSaidAM && hours === 12) {
    hours = 0;
  } else if (!hasExplicitMeridiem && hours >= 1 && hours <= 12) {
    // Ambiguous 12-hour number — infer AM or PM from working hours
    hours = inferMeridiem(hours, minutes, minTime, maxTime);
  }

  // Validate
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Given an ambiguous 1-12 hour (and minutes), return the 24h hour value
 * that best fits the working hours window.
 *
 * Rules (applied in order):
 * 1. If only the PM candidate fits   → pick PM
 * 2. If only the AM candidate fits   → pick AM
 * 3. If both / neither fit           → business heuristic:
 *      7–11 → AM  (morning slots)
 *      12, 1–6 → PM  (afternoon slots)
 *      (anything else keeps as-is so out-of-bounds error is shown)
 */
function inferMeridiem(
  hour12: number,
  minutes: number,
  minTime?: string,
  maxTime?: string,
): number {
  const pmHour = hour12 === 12 ? 12 : hour12 + 12;
  const amHour = hour12 === 12 ? 0 : hour12;

  if (!minTime || !maxTime) {
    // No working hours context — fall back to heuristic
    return defaultMeridiemHeuristic(hour12, pmHour);
  }

  const minMins = hhmmToMins(minTime);
  const maxMins = hhmmToMins(maxTime);

  const amMins  = amHour  * 60 + minutes;
  const pmMins  = pmHour  * 60 + minutes;

  const amFits = amMins  >= minMins && amMins  <= maxMins;
  const pmFits = pmMins  >= minMins && pmMins  <= maxMins;

  if (pmFits && !amFits) return pmHour;   // only PM fits → PM
  if (amFits && !pmFits) return amHour;   // only AM fits → AM
  // Both or neither: use heuristic
  return defaultMeridiemHeuristic(hour12, pmHour);
}

/** Business heuristic: 7-11 → AM, everything else (12, 1-6) → PM */
function defaultMeridiemHeuristic(hour12: number, pmHour: number): number {
  if (hour12 >= 7 && hour12 <= 11) return hour12; // AM — keep as-is
  return pmHour;                                   // PM
}

function formatDisplayTime(hhmm: string | null | undefined, format: '12h' | '24h'): string {
  if (!hhmm || !hhmm.trim()) return '';
  if (format === '24h') return hhmm;

  const [hStr, mStr] = hhmm.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return hhmm;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr ?? '00'} ${ampm}`;
}

function generateTimeSlots(minTime: string, maxTime: string, stepMinutes: number): string[] {
  const slots: string[] = [];
  const [minH, minM] = minTime.split(':').map(Number);
  const [maxH, maxM] = maxTime.split(':').map(Number);

  let currentMins = (minH || 0) * 60 + (minM || 0);
  const maxMins = (maxH || 23) * 60 + (maxM || 59);

  while (currentMins <= maxMins) {
    const h = Math.floor(currentMins / 60);
    const m = currentMins % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    currentMins += stepMinutes;
  }
  return slots;
}

function hhmmToMins(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export interface SmartTimeInputProps {
  value?: string; // HH:MM format
  onChange?: (time: string) => void;
  stepMinutes?: number;
  format?: '12h' | '24h';
  placeholder?: string;
  className?: string;
  minTime?: string; // HH:MM
  maxTime?: string; // HH:MM
}

export function SmartTimeInput({
  value = '',
  onChange,
  stepMinutes = 30,
  format = '12h',
  placeholder = 'Select or type time...',
  className,
  minTime = '00:00',
  maxTime = '23:59',
}: SmartTimeInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(() => formatDisplayTime(value, format));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(false);
  const inputValueRef = useRef(inputValue);
  inputValueRef.current = inputValue;
  // Set to true when a dropdown item is selected so blur-commit is skipped
  const selectionCommittedRef = useRef(false);

  // Sync internal display value from external controlled value only when unfocused
  useEffect(() => {
    if (!isFocusedRef.current) {
      setInputValue(formatDisplayTime(value, format));
      setErrorMsg(null);
    }
  }, [value, format]);

  const slots = useMemo(() => {
    return generateTimeSlots(minTime, maxTime, stepMinutes);
  }, [minTime, maxTime, stepMinutes]);

  const filteredSlots = useMemo(() => {
    if (!inputValue.trim()) return slots;
    const q = inputValue.toLowerCase().trim();
    const matched = slots.filter((slot) => {
      const formatted = formatDisplayTime(slot, format).toLowerCase();
      return formatted.includes(q) || slot.includes(q);
    });
    return matched.length > 0 ? matched : slots;
  }, [slots, inputValue, format]);

  /**
   * Called on Enter or blur. Non-destructive on invalid/OOB inputs.
   */
  const handleCommit = (rawInput: string) => {
    const trimmed = rawInput.trim();

    // If empty, treat as cleared
    if (!trimmed) {
      setErrorMsg(null);
      setInputValue('');
      if (onChange) onChange('');
      return;
    }

    const parsedHHMM = parseTimeToHHMM(trimmed, minTime, maxTime);

    if (!parsedHHMM) {
      setErrorMsg('Invalid time format.');
      return;
    }

    // Validate bounds
    const parsedMins = hhmmToMins(parsedHHMM);
    const minMins = hhmmToMins(minTime);
    const maxMins = hhmmToMins(maxTime);

    if (parsedMins < minMins || parsedMins > maxMins) {
      setErrorMsg(
        `Please select a time between ${formatDisplayTime(minTime, format)} and ${formatDisplayTime(maxTime, format)}.`,
      );
      return;
    }

    // Success
    setErrorMsg(null);
    const formatted = formatDisplayTime(parsedHHMM, format);
    setInputValue(formatted);
    if (parsedHHMM !== value && onChange) {
      onChange(parsedHHMM);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit(inputValueRef.current);
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      setOpen(true);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={open}
              value={inputValue}
              placeholder={placeholder}
              className={cn('pl-9 bg-background cursor-text', className)}
              onFocus={(e) => {
                isFocusedRef.current = true;
                setErrorMsg(null);
                // Select all text so typing immediately replaces previous time
                e.currentTarget.select();
              }}
              onClick={(e) => {
                setOpen(true);
                // Select all text on click as well
                e.currentTarget.select();
              }}
              onChange={(e) => {
                // Completely freeform typing - no interference
                setInputValue(e.target.value);
                setErrorMsg(null);
                setOpen(true);
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                isFocusedRef.current = false;
                // Give onSelect a chance to fire first (dropdown click),
                // then commit only if a dropdown selection didn't already handle it.
                setTimeout(() => {
                  if (selectionCommittedRef.current) {
                    selectionCommittedRef.current = false;
                    return;
                  }
                  handleCommit(inputValueRef.current);
                }, 200);
              }}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[200px]"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList className="max-h-[250px] overflow-y-auto">
              <CommandEmpty>No matching time.</CommandEmpty>
              <CommandGroup>
                {filteredSlots.map((slot) => (
                  <CommandItem
                    key={slot}
                    value={slot}
                    onSelect={() => {
                      selectionCommittedRef.current = true;
                      const formatted = formatDisplayTime(slot, format);
                      setInputValue(formatted);
                      setErrorMsg(null);
                      setOpen(false);
                      if (onChange) onChange(slot);
                    }}
                  >
                    {formatDisplayTime(slot, format)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {errorMsg && (
        <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
          {errorMsg}
        </p>
      )}
    </div>
  );
}