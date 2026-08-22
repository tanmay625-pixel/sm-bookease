'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { NewAppointmentModal } from '@/components/owner/new-appointment-modal';
import { AppointmentDetailsModal } from '@/components/owner/appointment-details-modal';
import {
  listAppointments,
  type AppointmentWithRelations,
} from '@/app/actions/owner/appointments';
import type { StaffRow, ServiceRow, WorkingHours } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { formatISTTime, formatISTDate, IST_OFFSET_MINUTES } from '@/lib/timezone';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeekViewProps {
  appointments: AppointmentWithRelations[];
  staff: StaffRow[];
  services: ServiceRow[];
  salonId: string;
  salonSlug: string;
  workingHours: WorkingHours;
  workingDays: string[];
  initialWeekStart: string;
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const HOUR_HEIGHT = 64; // pixels per hour
const SLOT_INTERVAL = 30; // minutes per grid line

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getISTDate(dateStrOrObj: string | Date): Date {
  const d = new Date(dateStrOrObj);
  return new Date(d.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
}

function getISTDay(dateStrOrObj: string | Date): number {
  return getISTDate(dateStrOrObj).getUTCDay();
}

function getISTDateParts(dateStrOrObj: string | Date) {
  const ist = getISTDate(dateStrOrObj);
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth(),
    date: ist.getUTCDate(),
    hours: ist.getUTCHours(),
    minutes: ist.getUTCMinutes(),
  };
}

function isSameDay(a: Date, b: Date): boolean {
  const aParts = getISTDateParts(a);
  const bParts = getISTDateParts(b);
  return (
    aParts.year === bParts.year &&
    aParts.month === bParts.month &&
    aParts.date === bParts.date
  );
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateLabel(d: Date): string {
  const day = getISTDay(d);
  const parts = getISTDateParts(d);
  return `${DAY_LABELS[day === 0 ? 6 : day - 1]} ${parts.date}`;
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const sParts = getISTDateParts(start);
  const eParts = getISTDateParts(end);
  const sMonth = MONTH_LABELS[sParts.month];
  const eMonth = MONTH_LABELS[eParts.month];
  return `${DAY_LABELS[0]} ${sParts.date} ${sMonth} – ${DAY_LABELS[6]} ${eParts.date} ${eMonth} ${eParts.year}`;
}

// ---------------------------------------------------------------------------
// Overlap grouping
// ---------------------------------------------------------------------------

interface PositionedAppointment {
  appointment: AppointmentWithRelations;
  index: number;
  groupSize: number;
}

function groupOverlapping(
  appts: AppointmentWithRelations[],
): PositionedAppointment[] {
  if (appts.length === 0) return [];

  const sorted = [...appts].sort(
    (a, b) =>
      new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime(),
  );

  const result: PositionedAppointment[] = [];
  const groups: AppointmentWithRelations[][] = [];

  for (const appt of sorted) {
    let placed = false;
    for (const group of groups) {
      const overlapsAny = group.some(
        (g) =>
          new Date(g.slot_start) < new Date(appt.slot_end) &&
          new Date(g.slot_end) > new Date(appt.slot_start),
      );
      if (overlapsAny) {
        group.push(appt);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push([appt]);
    }
  }

  for (const group of groups) {
    group.forEach((appt, idx) => {
      result.push({ appointment: appt, index: idx, groupSize: group.length });
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Status colours
// ---------------------------------------------------------------------------

function statusClasses(status: string) {
  switch (status) {
    case 'confirmed':
      return {
        border: 'border-l-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      };
    case 'cancelled':
      return {
        border: 'border-l-rose-500',
        bg: 'bg-rose-50 dark:bg-rose-950/30',
      };
    default:
      // pending / any other
      return {
        border: 'border-l-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
      };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeekView({
  appointments,
  staff,
  services,
  salonId,
  salonSlug,
  workingHours,
  workingDays,
  initialWeekStart,
}: WeekViewProps) {
  const router = useRouter();

  // ---- state ---------------------------------------------------------------
  const [weekStart, setWeekStart] = useState<Date>(
    () => new Date(initialWeekStart + 'T00:00:00'),
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAppointment, setModalAppointment] =
    useState<AppointmentWithRelations | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);
  const [modalInitialTime, setModalInitialTime] = useState<string | undefined>(undefined);

  // Details modal (for clicking existing appointment blocks)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsAppointment, setDetailsAppointment] =
    useState<AppointmentWithRelations | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Appointments state — initialised from server-rendered props, re-fetched on week nav
  const [weekAppointments, setWeekAppointments] =
    useState<AppointmentWithRelations[]>(appointments);
  const [loadingWeek, setLoadingWeek] = useState(false);

  // ---- derived values ------------------------------------------------------
  const dayStartMin = parseHHMM(workingHours.start);
  const dayEndMin = parseHHMM(workingHours.end);
  const totalMinutes = dayEndMin - dayStartMin;
  const gridHeight = (totalMinutes / 60) * HOUR_HEIGHT;

  // 7 days starting from weekStart (Mon)
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Re-fetch appointments when the viewed week changes
  useEffect(() => {
    const weekStartStr = weekStart.toISOString().split('T')[0];
    // Don't re-fetch for the initial server-rendered week
    if (weekStartStr === initialWeekStart) {
      setWeekAppointments(appointments);
      return;
    }
    let cancelled = false;
    setLoadingWeek(true);
    const sunday = addDays(weekStart, 6);
    const weekEndStr = sunday.toISOString().split('T')[0];
    listAppointments(salonId, {
      dateFrom: `${weekStartStr}T00:00:00`,
      dateTo: `${weekEndStr}T23:59:59`,
    })
      .then((data) => {
        if (!cancelled) setWeekAppointments(data);
      })
      .catch(() => {
        if (!cancelled) setWeekAppointments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingWeek(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weekStart, salonId, initialWeekStart, appointments]);

  // "now" ticker — update every 60 s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ---- filtered appointments by staff -------------------------------------
  const filteredAppointments = useMemo(() => {
    if (selectedStaffId === 'all') return weekAppointments;
    return weekAppointments.filter((a) => a.staff_id === selectedStaffId);
  }, [weekAppointments, selectedStaffId]);

  // bucket appointments by day index (0-6, Mon-Sun)
  const appointmentsByDay = useMemo(() => {
    const buckets: AppointmentWithRelations[][] = Array.from(
      { length: 7 },
      () => [],
    );
    for (const appt of filteredAppointments) {
      const start = new Date(appt.slot_start);
      for (let i = 0; i < 7; i++) {
        if (isSameDay(start, weekDays[i])) {
          buckets[i].push(appt);
          break;
        }
      }
    }
    return buckets;
  }, [filteredAppointments, weekDays]);

  // ---- positioning helpers --------------------------------------------------
  const getBlockPosition = useCallback(
    (slotStart: Date, slotEnd: Date) => {
      const startParts = getISTDateParts(slotStart);
      const endParts = getISTDateParts(slotEnd);
      const startMin = startParts.hours * 60 + startParts.minutes;
      const endMin = endParts.hours * 60 + endParts.minutes;

      const topMin = Math.max(startMin - dayStartMin, 0);
      const bottomMin = Math.min(endMin - dayStartMin, totalMinutes);

      const top = (topMin / 60) * HOUR_HEIGHT;
      const height = Math.max(((bottomMin - topMin) / 60) * HOUR_HEIGHT, 20);

      return { top, height };
    },
    [dayStartMin, totalMinutes],
  );

  // ---- time gutter slots ----------------------------------------------------
  const timeSlots = useMemo(() => {
    const slots: number[] = [];
    for (let m = dayStartMin; m < dayEndMin; m += SLOT_INTERVAL) {
      slots.push(m);
    }
    return slots;
  }, [dayStartMin, dayEndMin]);

  // ---- hour grid lines ------------------------------------------------------
  const hourLines = useMemo(() => {
    const lines: number[] = [];
    // first full hour at or after dayStart
    const firstHour = Math.ceil(dayStartMin / 60) * 60;
    for (let m = firstHour; m <= dayEndMin; m += 60) {
      lines.push(m);
    }
    return lines;
  }, [dayStartMin, dayEndMin]);

  // ---- "now" indicator position ---------------------------------------------
  const nowIndicator = useMemo(() => {
    const parts = getISTDateParts(now);
    const nowMin = parts.hours * 60 + parts.minutes;
    if (nowMin < dayStartMin || nowMin > dayEndMin) return null;
    // check if today is in this week
    const dayIdx = weekDays.findIndex((d) => isSameDay(d, now));
    if (dayIdx === -1) return null;
    const top = ((nowMin - dayStartMin) / 60) * HOUR_HEIGHT;
    return { top, dayIdx };
  }, [now, dayStartMin, dayEndMin, weekDays]);

  // ---- navigation -----------------------------------------------------------
  const goToPrevWeek = () => setWeekStart((d) => addDays(d, -7));
  const goToNextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goToToday = () => setWeekStart(getMondayOfWeek(new Date()));

  // ---- day column click (empty slot) ----------------------------------------
  const handleDayClick = useCallback(
    (dayDate: Date, e: React.MouseEvent<HTMLDivElement>) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const clickedDay = new Date(dayDate);
      clickedDay.setHours(0, 0, 0, 0);
      if (clickedDay < todayStart) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const minutesFromStart = (y / HOUR_HEIGHT) * 60;
      let clickedMin = dayStartMin + minutesFromStart;
      
      // Round to nearest SLOT_INTERVAL (e.g. 30 mins, but let's say 30 mins)
      clickedMin = Math.floor(clickedMin / SLOT_INTERVAL) * SLOT_INTERVAL;
      
      if (clickedMin < dayStartMin) clickedMin = dayStartMin;
      if (clickedMin > dayEndMin) clickedMin = dayEndMin;

      const hhmm = minutesToHHMM(clickedMin);

      const istParts = getISTDateParts(dayDate);
      const yyyyMmDd = `${istParts.year}-${String(istParts.month + 1).padStart(2, '0')}-${String(istParts.date).padStart(2, '0')}`;

      setModalInitialDate(yyyyMmDd);
      setModalInitialTime(hhmm);
      setModalAppointment(null);
      setModalOpen(true);
    },
    [dayStartMin, dayEndMin],
  );

  // ---- appointment block click ----------------------------------------------
  const handleBlockClick = useCallback(
    (appt: AppointmentWithRelations, e: React.MouseEvent) => {
      e.stopPropagation(); // prevent day-column click
      // Open details modal for all appointments (past = read-only, future = editable)
      setDetailsAppointment(appt);
      setDetailsOpen(true);
    },
    [],
  );

  // ---- render ---------------------------------------------------------------
  const today = new Date();

  return (
    <div className="flex flex-col gap-4 min-h-0">
      {/* ===== Toolbar (sticky) ===== */}
      <div className="sticky top-0 z-20 bg-background pt-1 pb-2 flex flex-wrap items-center gap-2">
        {/* Week nav */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={goToPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        {/* Week range label */}
        <span className="text-sm font-semibold whitespace-nowrap">
          {formatWeekRange(weekStart)}
        </span>

        {/* Staff filter pills */}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button
            onClick={() => setSelectedStaffId('all')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              selectedStaffId === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            All Staff
          </button>
          {staff.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStaffId(s.id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                selectedStaffId === s.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* New appointment button */}
        <Button
          size="sm"
          onClick={() => {
            setModalAppointment(null);
            setModalInitialDate(undefined);
            setModalInitialTime(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {/* ===== Grid ===== */}
      <div className="relative overflow-x-auto rounded-lg border border-border">
        {/* Loading overlay */}
        {loadingWeek && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <p className="text-xs font-medium text-muted-foreground animate-pulse">
              Loading appointments…
            </p>
          </div>
        )}
        <div className="min-w-[800px]">
          {/* Header row (sticky) */}
          <div className="sticky top-0 z-10 flex border-b border-border bg-muted/40">
            {/* Gutter spacer */}
            <div className="w-14 shrink-0" />

            {weekDays.map((day, idx) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={idx}
                  className="flex-1 border-l border-border px-1 py-2 text-center"
                >
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isToday
                        ? 'text-primary font-bold'
                        : 'text-muted-foreground',
                    )}
                  >
                    {DAY_LABELS[idx]}
                  </span>
                  <span
                    className={cn(
                      'ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground',
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Body: gutter + columns */}
          <div className="relative flex">
            {/* Time gutter */}
            <div
              className="relative w-14 shrink-0"
              style={{ height: gridHeight }}
            >
              {timeSlots.map((min) => {
                const top = ((min - dayStartMin) / 60) * HOUR_HEIGHT;
                return (
                  <div
                    key={min}
                    className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground"
                    style={{ top }}
                  >
                    {minutesToHHMM(min)}
                  </div>
                );
              })}
            </div>

            {/* Day columns + grid lines wrapper */}
            <div className="relative flex flex-1">
              {/* Hour grid lines (spans all columns) */}
              {hourLines.map((min) => {
                const top = ((min - dayStartMin) / 60) * HOUR_HEIGHT;
                return (
                  <div
                    key={min}
                    className="pointer-events-none absolute left-0 right-0 border-t border-border/50"
                    style={{ top }}
                  />
                );
              })}

              {/* "Now" indicator line */}
              {nowIndicator && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-red-500"
                  style={{ top: nowIndicator.top }}
                >
                  <div className="absolute -left-1 -top-[5px] h-[10px] w-[10px] rounded-full bg-red-500" />
                </div>
              )}

              {/* Day columns */}
              {weekDays.map((day, dayIdx) => {
                const dayKey = DAY_KEYS[dayIdx];
                const isOpen = workingDays.includes(dayKey);
                const positioned = groupOverlapping(appointmentsByDay[dayIdx]);

                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      'relative flex-1 border-l border-border',
                      !isOpen && 'bg-muted/30',
                    )}
                    style={{ height: gridHeight }}
                    onClick={
                      isOpen ? (e) => handleDayClick(day, e) : undefined
                    }
                  >
                    {/* Closed overlay */}
                    {!isOpen && (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-xs font-medium text-muted-foreground">
                          Closed
                        </span>
                      </div>
                    )}

                    {/* Appointment blocks */}
                    {isOpen &&
                      positioned.map(
                        ({ appointment, index, groupSize }) => {
                          const start = new Date(appointment.slot_start);
                          const end = new Date(appointment.slot_end);
                          const { top, height } = getBlockPosition(
                            start,
                            end,
                          );
                          const sc = statusClasses(appointment.status);
                          const widthPct = 100 / groupSize;
                          const leftPct = index * widthPct;

                          let serviceName = 'Service';
                          if (appointment.appointment_services && appointment.appointment_services.length > 0) {
                            serviceName = appointment.appointment_services
                              .map(as => as.services?.name)
                              .filter(Boolean)
                              .join(' + ');
                          } else if (appointment.services) {
                            serviceName = appointment.services.name;
                          }

                          const customerName =
                            appointment.customers?.name ?? 'Customer';
                          
                          const startParts = getISTDateParts(start);
                          const endParts = getISTDateParts(end);
                          const timeLabel = `${minutesToHHMM(
                            startParts.hours * 60 + startParts.minutes,
                          )} – ${minutesToHHMM(
                            endParts.hours * 60 + endParts.minutes,
                          )}`;

                          const isPast =
                            new Date(appointment.slot_start).getTime() <=
                            Date.now();

                          return (
                            <div
                              key={appointment.id}
                              className="absolute z-10 group"
                              style={{
                                top,
                                height,
                                width: `${widthPct}%`,
                                left: `${leftPct}%`,
                              }}
                            >
                              <div
                                className={cn(
                                  'h-full w-full overflow-hidden rounded-md border-l-[3px] px-1 py-0.5 transition-opacity cursor-pointer hover:opacity-90',
                                  isPast ? 'opacity-75' : '',
                                  sc.border,
                                  sc.bg,
                                )}
                                onClick={(e) =>
                                  handleBlockClick(appointment, e)
                                }
                              >
                                <p className="truncate text-[10px] font-bold leading-tight">
                                  {serviceName}
                                </p>
                                <p className="truncate text-[10px] leading-tight text-muted-foreground">
                                  {customerName}
                                </p>
                                <p className="truncate text-[9px] leading-tight text-muted-foreground">
                                  {timeLabel}
                                </p>
                              </div>
                            </div>
                          );
                        },
                      )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===== New Appointment Modal (empty slot click) ===== */}
      <NewAppointmentModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setModalAppointment(null);
          }
        }}
        salonId={salonId}
        salonSlug={salonSlug}
        staff={staff}
        services={services}
        workingHours={workingHours as { start: string; end: string }}
        appointment={modalAppointment}
        initialDate={modalInitialDate}
        initialTime={modalInitialTime}
        onSuccess={() => {
          const weekStartStr = weekStart.toISOString().split('T')[0];
          const sunday = addDays(weekStart, 6);
          const weekEndStr = sunday.toISOString().split('T')[0];
          listAppointments(salonId, {
            dateFrom: `${weekStartStr}T00:00:00`,
            dateTo: `${weekEndStr}T23:59:59`,
          }).then(setWeekAppointments).catch(() => {});
          router.refresh();
        }}
      />

      {/* ===== Details Modal (block click) ===== */}
      {detailsAppointment && (
        <AppointmentDetailsModal
          appointment={detailsAppointment}
          open={detailsOpen}
          onOpenChange={(open) => {
            setDetailsOpen(open);
            if (!open) setDetailsAppointment(null);
          }}
          salonId={salonId}
          salonSlug={salonSlug}
          staff={staff}
          services={services}
          workingHours={workingHours as { start: string; end: string }}
          onSuccess={() => {
            const weekStartStr = weekStart.toISOString().split('T')[0];
            const sunday = addDays(weekStart, 6);
            const weekEndStr = sunday.toISOString().split('T')[0];
            listAppointments(salonId, {
              dateFrom: `${weekStartStr}T00:00:00`,
              dateTo: `${weekEndStr}T23:59:59`,
            }).then(setWeekAppointments).catch(() => {});
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
