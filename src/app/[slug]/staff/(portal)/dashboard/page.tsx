import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/staff-session';
import { listStaffAppointments } from '@/app/actions/staff/appointments';
import { listServices } from '@/app/actions/owner/services';
import { listStaff } from '@/app/actions/owner/staff';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { TokenStubCard } from '@/components/token-stub-card';
import { StaffAppointmentStatusActions } from '@/components/staff/staff-appointment-status-actions';
import { StaffNewAppointmentTrigger } from '@/components/staff/staff-new-appointment-trigger';
import { CalendarDays, Clock, Users, XCircle } from 'lucide-react';
import { todayIST, formatISTDate, toIST } from '@/lib/timezone';
import type { SalonRow } from '@/lib/supabase/types';

export default async function StaffDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireStaffSession(slug);

  const today = todayIST();

  // Fetch salon info (for working hours etc.)
  const supabase = createServiceSupabaseClient();
  const { data: salonData } = await supabase
    .from('salons')
    .select('*')
    .eq('id', session.salonId)
    .single();
  const salon = salonData as SalonRow | null;
  if (!salon) redirect(`/${slug}/staff/login`);

  const [todayAppts, weekAppts, services, allStaff] = await Promise.all([
    listStaffAppointments(slug, {
      dateFrom: `${today}T00:00:00Z`,
      dateTo:   `${today}T23:59:59Z`,
    }),
    listStaffAppointments(slug, {
      dateFrom: `${today}T00:00:00Z`,
      dateTo: (() => {
        const d = toIST(today, '00:00');
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0] + 'T23:59:59Z';
      })(),
    }),
    listServices(session.salonId),
    listStaff(session.salonId),
  ]);

  const pending   = todayAppts.filter((a) => a.status === 'pending');
  const cancelled = todayAppts.filter((a) => a.status === 'cancelled');

  const statCards = [
    { label: "Today's Appointments", value: todayAppts.length, Icon: CalendarDays, color: 'text-primary' },
    { label: 'This Week',             value: weekAppts.length,  Icon: Clock,         color: 'text-sky-600' },
    { label: 'Pending Today',         value: pending.length,    Icon: Users,         color: 'text-amber-600' },
    { label: 'Cancelled Today',       value: cancelled.length,  Icon: XCircle,       color: 'text-rose-600' },
  ];

  const wh = salon.working_hours as { start: string; end: string };

  // Only show this staff member's own row in the new-appointment modal staff list
  const myStaffRow = allStaff.find((s) => s.id === session.staffId);
  const staffForModal = myStaffRow ? [myStaffRow] : allStaff;

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
        <StaffNewAppointmentTrigger
          slug={slug}
          salonId={session.salonId}
          staffId={session.staffId}
          staff={staffForModal}
          services={services}
          workingHours={wh}
          timeFormat={salon.time_format as '12h' | '24h'}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(({ label, value, Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Icon className={`size-4 ${color}`} />
            </div>
            <span className="text-2xl font-bold">{value}</span>
          </div>
        ))}
      </div>

      {/* Today's appointments */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Today&apos;s Appointments</h2>
        {todayAppts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No appointments for today.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {todayAppts.map((appt) => (
              <TokenStubCard
                key={appt.id}
                appointment={appt}
                compact
                actions={
                  <StaffAppointmentStatusActions
                    appointment={appt}
                    slug={slug}
                    salonId={session.salonId}
                    staffId={session.staffId}
                    staff={staffForModal}
                    services={services}
                    workingHours={wh}
                    timeFormat={salon.time_format as '12h' | '24h'}
                  />
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

