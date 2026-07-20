import { getSalonBySlug, getAppointments, getClients, getStaff, getServices } from "@/lib/owner-data";
import { PageHeader } from "@/components/owner/page-header";
import { StatCard } from "@/components/owner/stat-card";
import { NewAppointmentButton } from "@/components/owner/new-appointment-button";
import { AppointmentActions } from "@/components/owner/appointment-actions";
import { AppointmentStub } from "@/components/appointment-stub";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { formatTimeRange } from "@/lib/format";
import {
  Calendar03Icon,
  CalendarCheckIn01Icon,
  Clock01Icon,
  UserMultipleIcon,
  InboxIcon,
} from "@hugeicons/core-free-icons";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(startOfDay);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const [today, week, clients, staff, services] = await Promise.all([
    getAppointments(salon.id, {
      dateFrom: startOfDay.toISOString(),
      dateTo: endOfDay.toISOString(),
    }),
    getAppointments(salon.id, {
      dateFrom: startOfDay.toISOString(),
      dateTo: endOfWeek.toISOString(),
    }),
    getClients(salon.id),
    getStaff(salon.id),
    getServices(salon.id),
  ]);

  const pendingCount = week.filter((a) => a.status === "pending").length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Here's what's happening at ${salon.name} today.`}
        action={<NewAppointmentButton services={services} staff={staff} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Today's appointments" value={today.length} icon={Calendar03Icon} tint="primary" />
        <StatCard label="This week" value={week.length} icon={CalendarCheckIn01Icon} tint="primary" />
        <StatCard label="Pending" value={pendingCount} icon={Clock01Icon} tint="accent" />
        <StatCard label="Total clients" value={clients.length} icon={UserMultipleIcon} tint="primary" />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl text-foreground">Today&apos;s appointments</h2>
          <span className="text-sm text-muted-foreground">{today.length} scheduled</span>
        </div>

        {today.length === 0 ? (
          <EmptyToday />
        ) : (
          <div className="flex flex-col gap-3">
            {today.map((a) => (
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
        )}
      </section>
    </>
  );
}

function EmptyToday() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon icon={InboxIcon} size={28} />
      </span>
      <h3 className="font-heading text-xl text-foreground">No appointments today</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        They&apos;ll show up here as customers book. Use New Appointment to add one manually.
      </p>
    </Card>
  );
}
