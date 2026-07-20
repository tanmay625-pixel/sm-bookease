"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Icon } from "@/components/ui/icon";
import { NewAppointmentDialog } from "@/components/owner/new-appointment-button";
import { ArrowLeft01Icon, ArrowRight01Icon, Add01Icon } from "@hugeicons/core-free-icons";
import { formatTime, isSameDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApptWithCustomer } from "@/lib/mock-data";
import type { ServiceRow, StaffRow } from "@/lib/supabase/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const START_HOUR = 9;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const ROW_HEIGHT = 56; // px per hour

function startOfWeek(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7; // Mon = 0
  date.setDate(date.getDate() - day);
  return date;
}

const statusColor: Record<string, string> = {
  pending: "border-status-pending bg-status-pending/12 text-foreground",
  confirmed: "border-status-confirmed bg-status-confirmed/12 text-foreground",
  cancelled: "border-status-cancelled bg-status-cancelled/10 text-muted-foreground line-through",
};

export function CalendarWeek({
  appointments,
  services,
  staff,
}: {
  appointments: ApptWithCustomer[];
  services: ServiceRow[];
  staff: StaffRow[];
}) {
  const [weekStart, setWeekStart] = React.useState(() => startOfWeek(new Date()));
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [prefill, setPrefill] = React.useState<{ date?: string; time?: string }>({});

  const days = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? "Service";
  const today = new Date();

  function shiftWeek(delta: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  }

  function openSlot(day: Date, hour: number) {
    const dateStr = new Date(day.getTime() - day.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    setPrefill({ date: dateStr, time: `${String(hour).padStart(2, "0")}:00` });
    setDialogOpen(true);
  }

  const rangeLabel = `${days[0].toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })} – ${days[6].toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftWeek(-1)} aria-label="Previous week">
            <Icon icon={ArrowLeft01Icon} size={18} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => shiftWeek(1)} aria-label="Next week">
            <Icon icon={ArrowRight01Icon} size={18} />
          </Button>
          <Button variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            Today
          </Button>
          <span className="ml-2 font-heading text-lg text-foreground">{rangeLabel}</span>
        </div>
        <Button variant="accent" onClick={() => { setPrefill({}); setDialogOpen(true); }}>
          <Icon icon={Add01Icon} size={18} />
          New Appointment
        </Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <div className="min-w-[720px]">
          {/* Header row */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
            <div className="border-r border-border" />
            {days.map((d, i) => {
              const isToday = isSameDay(d, today);
              return (
                <div
                  key={i}
                  className={cn(
                    "border-r border-border px-2 py-2.5 text-center last:border-r-0",
                    isToday && "bg-accent/10"
                  )}
                >
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {DAY_LABELS[i]}
                  </p>
                  <p
                    className={cn(
                      "mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full font-heading text-sm",
                      isToday ? "bg-accent text-accent-foreground" : "text-foreground"
                    )}
                  >
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)]">
            {/* Hour labels */}
            <div className="border-r border-border">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="relative border-b border-border/60 pr-2 text-right"
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="absolute -top-2 right-2 text-[11px] text-muted-foreground">
                    {formatTime(new Date(2020, 0, 1, h).toISOString())}
                  </span>
                </div>
              ))}
            </div>

            {days.map((day, di) => {
              const dayAppts = appointments.filter(
                (a) => isSameDay(new Date(a.slot_start), day) && a.status !== "cancelled"
              );
              return (
                <div key={di} className="relative border-r border-border last:border-r-0">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => openSlot(day, h)}
                      className="block w-full border-b border-border/60 transition-colors hover:bg-accent/10"
                      style={{ height: ROW_HEIGHT }}
                      aria-label={`Add appointment ${DAY_LABELS[di]} ${h}:00`}
                    />
                  ))}
                  {dayAppts.map((a) => {
                    const start = new Date(a.slot_start);
                    const end = new Date(a.slot_end);
                    const top =
                      (start.getHours() - START_HOUR + start.getMinutes() / 60) * ROW_HEIGHT;
                    const height = Math.max(
                      ((end.getTime() - start.getTime()) / 3600000) * ROW_HEIGHT,
                      26
                    );
                    return (
                      <div
                        key={a.id}
                        className={cn(
                          "absolute inset-x-1 overflow-hidden rounded-lg border-l-2 px-2 py-1 text-[11px] leading-tight shadow-sm",
                          statusColor[a.status]
                        )}
                        style={{ top, height }}
                      >
                        <p className="truncate font-medium">{a.customers?.name ?? "Booking"}</p>
                        <p className="truncate opacity-80">{serviceName(a.service_id)}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge status="pending" /> awaiting confirmation
        </span>
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge status="confirmed" /> confirmed
        </span>
        <span>Tap an empty slot to book.</span>
      </div>

      <NewAppointmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        services={services}
        staff={staff}
        prefill={prefill}
      />
    </div>
  );
}
