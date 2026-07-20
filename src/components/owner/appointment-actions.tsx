"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import {
  MoreVerticalIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

/**
 * Appointment row actions. Frontend-only menu — wire each item to the
 * updateAppointmentStatus server action to persist.
 */
export function AppointmentActions({ status }: { status: "pending" | "confirmed" | "cancelled" }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const items = [
    { label: "Confirm", icon: CheckmarkCircle02Icon, show: status !== "confirmed" },
    { label: "Cancel", icon: Cancel01Icon, show: status !== "cancelled", danger: true },
    { label: "Edit", icon: PencilEdit02Icon, show: true },
  ].filter((i) => i.show);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Appointment actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
      >
        <Icon icon={MoreVerticalIcon} size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-secondary/70",
                item.danger ? "text-destructive" : "text-foreground"
              )}
            >
              <Icon icon={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
