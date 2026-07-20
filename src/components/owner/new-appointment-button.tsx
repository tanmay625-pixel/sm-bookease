"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Add01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { formatDuration, formatPrice } from "@/lib/format";
import type { ServiceRow, StaffRow } from "@/lib/supabase/types";

type Prefill = { date?: string; time?: string; staffId?: string };

export function NewAppointmentButton({
  services,
  staff,
  variant = "accent",
  label = "New Appointment",
}: {
  services: ServiceRow[];
  staff: StaffRow[];
  variant?: "accent" | "outline";
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Icon icon={Add01Icon} size={18} />
        {label}
      </Button>
      <NewAppointmentDialog
        open={open}
        onClose={() => setOpen(false)}
        services={services}
        staff={staff}
      />
    </>
  );
}

export function NewAppointmentDialog({
  open,
  onClose,
  services,
  staff,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  services: ServiceRow[];
  staff: StaffRow[];
  prefill?: Prefill;
}) {
  const [serviceId, setServiceId] = React.useState(services[0]?.id ?? "");
  const [done, setDone] = React.useState(false);
  const selected = services.find((s) => s.id === serviceId);

  React.useEffect(() => {
    if (open) {
      setDone(false);
      setServiceId(services[0]?.id ?? "");
    }
  }, [open, services]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Frontend-only: surface a success state. Wire to createAppointmentAsOwner to persist.
    setDone(true);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={done ? "Appointment created" : "New appointment"}
      description={done ? undefined : "Book a slot for a client."}
    >
      {done ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-status-confirmed/12 text-status-confirmed">
            <Icon icon={CheckmarkCircle02Icon} size={32} />
          </span>
          <p className="text-sm text-muted-foreground">
            The appointment was added as <span className="font-medium text-foreground">Pending</span>.
          </p>
          <Button variant="primary" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="na-name">Client name</Label>
              <Input id="na-name" required placeholder="e.g. Ananya Iyer" />
            </div>
            <div>
              <Label htmlFor="na-phone">Phone</Label>
              <Input id="na-phone" required type="tel" placeholder="+91 90000 00000" />
            </div>
            <div>
              <Label htmlFor="na-email">Email (optional)</Label>
              <Input id="na-email" type="email" placeholder="name@example.com" />
            </div>
            <div>
              <Label htmlFor="na-service">Service</Label>
              <Select
                id="na-service"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {formatPrice(s.price)}
                  </option>
                ))}
              </Select>
              {selected && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Duration: {formatDuration(selected.duration_minutes)}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="na-staff">Staff</Label>
              <Select id="na-staff" defaultValue={prefill?.staffId ?? "any"}>
                <option value="any">Any available</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="na-date">Date</Label>
              <Input id="na-date" type="date" defaultValue={prefill?.date} required />
            </div>
            <div>
              <Label htmlFor="na-time">Time slot</Label>
              <Input id="na-time" type="time" defaultValue={prefill?.time} required />
            </div>
            <div>
              <Label htmlFor="na-status">Status</Label>
              <Select id="na-status" defaultValue="pending">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="na-notes">Notes (optional)</Label>
              <Textarea id="na-notes" placeholder="Anything the stylist should know…" />
            </div>
          </div>
          <div className="mt-1 flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Create appointment
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
