"use client";

import * as React from "react";
import { AppointmentStub } from "@/components/appointment-stub";
import { AppointmentActions } from "@/components/owner/appointment-actions";
import { Input, Select } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Search01Icon, InboxIcon } from "@hugeicons/core-free-icons";
import { formatTimeRange, formatLongDate } from "@/lib/format";
import type { ApptWithCustomer } from "@/lib/mock-data";
import type { ServiceRow, StaffRow } from "@/lib/supabase/types";

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled";

export function AppointmentsBrowser({
  appointments,
  services,
  staff,
}: {
  appointments: ApptWithCustomer[];
  services: ServiceRow[];
  staff: StaffRow[];
}) {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [staffId, setStaffId] = React.useState("all");

  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? "Service";
  const staffName = (id: string | null) =>
    id ? (staff.find((s) => s.id === id)?.name ?? "Staff") : "Any available";

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return appointments.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (staffId !== "all" && a.staff_id !== staffId) return false;
      if (term) {
        const hay = `${a.customers?.name ?? ""} ${a.customers?.phone ?? ""} ${serviceName(
          a.service_id
        )}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, search, status, staffId]);

  const groups = React.useMemo(() => {
    const map = new Map<string, ApptWithCustomer[]>();
    for (const a of filtered) {
      const key = new Date(a.slot_start).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Icon icon={Search01Icon} size={18} />
          </span>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, phone or service…"
            className="pl-10"
            aria-label="Search appointments"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="sm:w-40"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="sm:w-44"
          aria-label="Filter by staff"
        >
          <option value="all">All staff</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Card>

      {groups.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Icon icon={InboxIcon} size={28} />
          </span>
          <h3 className="font-heading text-xl text-foreground">No matching appointments</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try clearing filters or searching a different name.
          </p>
        </Card>
      ) : (
        groups.map(([day, items]) => (
          <section key={day}>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {formatLongDate(items[0].slot_start)}
            </h2>
            <div className="flex flex-col gap-3">
              {items.map((a) => (
                <AppointmentStub
                  key={a.id}
                  clientName={a.customers?.name ?? "Unknown"}
                  serviceName={serviceName(a.service_id)}
                  staffName={staffName(a.staff_id)}
                  timeLabel={formatTimeRange(a.slot_start, a.slot_end)}
                  status={a.status}
                  actions={<AppointmentActions status={a.status} />}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
