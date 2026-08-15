'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface ScrollTimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  minTime?: string; // "HH:MM", default "00:00"
  maxTime?: string; // "HH:MM", default "23:55"
  minuteStep?: number; // default 5
  disabled?: boolean;
  label?: string;
  className?: string;
}

const ITEM_HEIGHT = 28; // Fixed height of each item in px

export function ScrollTimePicker({
  value,
  onChange,
  minTime = '00:00',
  maxTime = '23:55',
  minuteStep = 5,
  disabled = false,
  label,
  className,
}: ScrollTimePickerProps) {
  // Parse min/max bounds
  const [minH, minM] = minTime.split(':').map(Number);
  const [maxH, maxM] = maxTime.split(':').map(Number);

  // Parse current value
  const [currentHStr, currentMStr] = value ? value.split(':') : ['00', '00'];
  const currentH = parseInt(currentHStr, 10) || 0;
  const currentM = parseInt(currentMStr, 10) || 0;

  // Generate lists
  const hours = useMemo(() => {
    const list = [];
    for (let i = minH; i <= maxH; i++) {
      list.push(i);
    }
    return list;
  }, [minH, maxH]);

  const minutes = useMemo(() => {
    const list = [];
    const start = currentH === minH ? Math.ceil(minM / minuteStep) * minuteStep : 0;
    const end = currentH === maxH ? Math.floor(maxM / minuteStep) * minuteStep : 59;
    
    for (let i = start; i <= end; i += minuteStep) {
      list.push(i);
    }
    return list;
  }, [currentH, minH, minM, maxH, maxM, minuteStep]);

  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  
  // Guard against scroll feedback loop
  const isProgrammaticScrollH = useRef(false);
  const isProgrammaticScrollM = useRef(false);
  const scrollTimeoutH = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutM = useRef<NodeJS.Timeout | null>(null);

  // Sync scroll position from external value
  useEffect(() => {
    if (hoursRef.current) {
      const idx = hours.indexOf(currentH);
      if (idx !== -1) {
        const targetScrollTop = idx * ITEM_HEIGHT;
        if (hoursRef.current.scrollTop !== targetScrollTop) {
          isProgrammaticScrollH.current = true;
          hoursRef.current.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
          
          if (scrollTimeoutH.current) clearTimeout(scrollTimeoutH.current);
          scrollTimeoutH.current = setTimeout(() => {
            isProgrammaticScrollH.current = false;
          }, 50); // Wait for smooth scroll to finish
        }
      }
    }
  }, [currentH, hours]);

  useEffect(() => {
    if (minutesRef.current) {
      // If the current minute is not in the list (e.g., due to hour change shrinking bounds),
      // we need to clamp and update.
      let clampedM = currentM;
      if (minutes.length > 0) {
        if (currentM < minutes[0]) clampedM = minutes[0];
        if (currentM > minutes[minutes.length - 1]) clampedM = minutes[minutes.length - 1];
      }
      
      if (clampedM !== currentM) {
        // Fire onChange to sync up with clamped bounds
        onChange(`${currentH.toString().padStart(2, '0')}:${clampedM.toString().padStart(2, '0')}`);
      } else {
        const idx = minutes.indexOf(clampedM);
        if (idx !== -1) {
          const targetScrollTop = idx * ITEM_HEIGHT;
          if (minutesRef.current.scrollTop !== targetScrollTop) {
            isProgrammaticScrollM.current = true;
            minutesRef.current.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
            
            if (scrollTimeoutM.current) clearTimeout(scrollTimeoutM.current);
            scrollTimeoutM.current = setTimeout(() => {
              isProgrammaticScrollM.current = false;
            }, 50);
          }
        }
      }
    }
  }, [currentH, currentM, minutes, onChange]);

  const handleScrollH = useCallback(() => {
    if (isProgrammaticScrollH.current || disabled) return;
    if (!hoursRef.current) return;
    
    const scrollTop = hoursRef.current.scrollTop;
    const idx = Math.round(scrollTop / ITEM_HEIGHT);
    const selectedH = hours[idx];
    
    if (selectedH !== undefined && selectedH !== currentH) {
      onChange(`${selectedH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`);
    }
  }, [hours, currentH, currentM, onChange, disabled]);

  const handleScrollM = useCallback(() => {
    if (isProgrammaticScrollM.current || disabled) return;
    if (!minutesRef.current) return;
    
    const scrollTop = minutesRef.current.scrollTop;
    const idx = Math.round(scrollTop / ITEM_HEIGHT);
    const selectedM = minutes[idx];
    
    if (selectedM !== undefined && selectedM !== currentM) {
      onChange(`${currentH.toString().padStart(2, '0')}:${selectedM.toString().padStart(2, '0')}`);
    }
  }, [minutes, currentH, currentM, onChange, disabled]);

  // Native wheel event intercept for precise 1-step scrolling
  useEffect(() => {
    const hr = hoursRef.current;
    const mr = minutesRef.current;

    const onWheelH = (e: WheelEvent) => {
      e.preventDefault();
      if (disabled || isProgrammaticScrollH.current) return;
      const direction = Math.sign(e.deltaY);
      if (direction === 0) return;
      
      const idx = hours.indexOf(currentH);
      if (idx !== -1) {
        const nextIdx = Math.max(0, Math.min(hours.length - 1, idx + direction));
        if (nextIdx !== idx) {
          const nextH = hours[nextIdx];
          onChange(`${nextH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`);
        }
      }
    };

    const onWheelM = (e: WheelEvent) => {
      e.preventDefault();
      if (disabled || isProgrammaticScrollM.current) return;
      const direction = Math.sign(e.deltaY);
      if (direction === 0) return;
      
      const idx = minutes.indexOf(currentM);
      if (idx !== -1) {
        const nextIdx = Math.max(0, Math.min(minutes.length - 1, idx + direction));
        if (nextIdx !== idx) {
          const nextM = minutes[nextIdx];
          onChange(`${currentH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`);
        }
      }
    };

    hr?.addEventListener('wheel', onWheelH, { passive: false });
    mr?.addEventListener('wheel', onWheelM, { passive: false });

    return () => {
      hr?.removeEventListener('wheel', onWheelH);
      mr?.removeEventListener('wheel', onWheelM);
    };
  }, [currentH, currentM, hours, minutes, disabled, onChange]);

  const handleItemClick = (type: 'h' | 'm', val: number, index: number) => {
    if (disabled) return;
    if (type === 'h') {
      if (val !== currentH) {
        onChange(`${val.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`);
      } else {
        // If clicking already selected, just scroll to it perfectly
        isProgrammaticScrollH.current = true;
        hoursRef.current?.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' });
        setTimeout(() => { isProgrammaticScrollH.current = false; }, 300);
      }
    } else {
      if (val !== currentM) {
        onChange(`${currentH.toString().padStart(2, '0')}:${val.toString().padStart(2, '0')}`);
      } else {
        isProgrammaticScrollM.current = true;
        minutesRef.current?.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' });
        setTimeout(() => { isProgrammaticScrollM.current = false; }, 300);
      }
    }
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <Label className="text-xs">{label}</Label>}
      <div 
        className={cn(
          "relative flex items-center justify-center rounded-lg border border-input bg-background overflow-hidden",
          disabled && "opacity-50 pointer-events-none"
        )}
        style={{ height: ITEM_HEIGHT * 5 }}
      >
        {/* Center highlight bar */}
        <div 
          className="absolute left-0 right-0 pointer-events-none bg-accent/50 border-y border-border"
          style={{ 
            height: ITEM_HEIGHT, 
            top: '50%', 
            transform: 'translateY(-50%)' 
          }} 
        />
        
        {/* Hours column */}
        <div 
          ref={hoursRef}
          onScroll={handleScrollH}
          className="flex-1 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory touch-pan-y"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div style={{ height: ITEM_HEIGHT * 2 }} /> {/* Top padding */}
          {hours.map((h, i) => (
            <div 
              key={h}
              onClick={() => handleItemClick('h', h, i)}
              className={cn(
                "flex items-center justify-center text-sm snap-center cursor-pointer transition-colors",
                h === currentH ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
              style={{ height: ITEM_HEIGHT }}
            >
              {h.toString().padStart(2, '0')}
            </div>
          ))}
          <div style={{ height: ITEM_HEIGHT * 2 }} /> {/* Bottom padding */}
        </div>

        <div className="flex items-center justify-center font-bold text-muted-foreground pb-1">
          :
        </div>

        {/* Minutes column */}
        <div 
          ref={minutesRef}
          onScroll={handleScrollM}
          className="flex-1 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory touch-pan-y"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div style={{ height: ITEM_HEIGHT * 2 }} /> {/* Top padding */}
          {minutes.map((m, i) => (
            <div 
              key={m}
              onClick={() => handleItemClick('m', m, i)}
              className={cn(
                "flex items-center justify-center text-sm snap-center cursor-pointer transition-colors",
                m === currentM ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
              style={{ height: ITEM_HEIGHT }}
            >
              {m.toString().padStart(2, '0')}
            </div>
          ))}
          <div style={{ height: ITEM_HEIGHT * 2 }} /> {/* Bottom padding */}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
