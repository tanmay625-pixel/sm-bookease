import { redirect } from 'next/navigation';
import { getCachedOwnerSalon } from '@/lib/supabase/cached';
import { listAppointments } from '@/app/actions/owner/appointments';
import { listStaff } from '@/app/actions/owner/staff';
import { listServices } from '@/app/actions/owner/services';
import { AppointmentCardWithDetails } from '@/components/owner/appointment-card-with-details';
import { AppointmentStatusActions } from '@/components/owner/appointment-status-actions';
import { NewAppointmentTrigger } from './NewAppointmentTrigger';
import { CalendarDays, Clock, Users, XCircle } from 'lucide-react';
import { todayIST, formatISTDate, toIST } from '@/lib/timezone';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // getCachedOwnerSalon is already memoised for this request by OwnerLayout.
  // This call returns the cached result — zero additional DB round-trips.
  const salon = await getCachedOwnerSalon(slug);
  if (!salon) redirect('/');

  const today = todayIST();

  const [todayAppts, weekAppts, staff, services] = await Promise.all([
    listAppointments(salon.id, {
      dateFrom: `${today}T00:00:00Z`,
      dateTo:   `${today}T23:59:59Z`,
    }),
    listAppointments(salon.id, {
      dateFrom: `${today}T00:00:00Z`,
      dateTo:   (() => {
        const d = toIST(today, '00:00');
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0] + 'T23:59:59Z';
      })(),
    }),
    listStaff(salon.id),
    listServices(salon.id),
  ]);

  const pending   = todayAppts.filter((a) => a.status === 'pending');
  const cancelled = todayAppts.filter((a) => a.status === 'cancelled');

  const statCards = [
    { label: "Today's Appointments", value: todayAppts.length, icon: CalendarDays, color: 'text-primary' },
    { label: 'This Week',             value: weekAppts.length,  icon: Clock,        color: 'text-sky-600' },
    { label: 'Pending Today',         value: pending.length,    icon: Users,        color: 'text-amber-600' },
    { label: 'Cancelled Today',       value: cancelled.length,  icon: XCircle,      color: 'text-rose-600' },
  ];

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatISTDate(`${today}T00:00:00Z`, false)}
          </p>
        </div>
        <NewAppointmentTrigger
          salonId={salon.id}
          salonSlug={slug}
          staff={staff}
          services={services}
          workingHours={salon.working_hours as { start: string; end: string }}
          timeFormat={salon.time_format || '12h'}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon className={`size-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Today's appointments */}
      <section>
        <h2 className="text-sm font-semibold mb-3">
          Today&apos;s Appointments
          {todayAppts.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({todayAppts.length})
            </span>
          )}
        </h2>

        {todayAppts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No appointments today — they&apos;ll show up here as customers book.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {todayAppts.map((a) => (
              <AppointmentCardWithDetails
                key={a.id}
                appointment={a}
                salonId={salon.id}
                salonSlug={slug}
                staff={staff}
                services={services}
                workingHours={salon.working_hours as { start: string; end: string } | undefined}
                timeFormat={salon.time_format || '12h'}
                actions={
                  a.status !== 'cancelled' ? (
                    <AppointmentStatusActions
                      appointment={a}
                      slug={slug}
                      salonId={salon.id}
                      staff={staff}
                      services={services}
                      workingHours={salon.working_hours as { start: string; end: string }}
                      timeFormat={salon.time_format || '12h'}
                    />
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
