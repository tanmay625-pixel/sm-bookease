import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/staff-session';
import { listStaffAppointments } from '@/app/actions/staff/appointments';
import { listServices } from '@/app/actions/owner/services';
import { listStaff } from '@/app/actions/owner/staff';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { WeekView } from '@/components/calendar/week-view';
import { toIST, todayIST } from '@/lib/timezone';
import type { SalonRow } from '@/lib/supabase/types';

export default async function StaffCalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireStaffSession(slug);

  const supabase = createServiceSupabaseClient();
  const { data: salonData } = await supabase.from('salons').select('*').eq('id', session.salonId).single();
  const salon = salonData as SalonRow | null;
  if (!salon) redirect(`/${slug}/staff/login`);

  // Compute Monday of current week
  const today = todayIST();
  const now = toIST(today, '00:00');
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + mondayOffset);
  const weekStartStr = monday.toISOString().split('T')[0];

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const weekEndStr = sunday.toISOString().split('T')[0];

  const [appointments, services, allStaff] = await Promise.all([
    listStaffAppointments(slug, {
      dateFrom: `${weekStartStr}T00:00:00Z`,
      dateTo:   `${weekEndStr}T23:59:59Z`,
    }),
    listServices(session.salonId),
    listStaff(session.salonId),
  ]);

  // Only pass the current staff member's row so WeekView filters to their view
  const myStaffRow = allStaff.find((s) => s.id === session.staffId);
  const staffForCalendar = myStaffRow ? [myStaffRow] : allStaff;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5 h-full min-h-0">
      <div className="sticky top-0 z-20 bg-background pb-2">
        <h1 className="text-xl font-semibold tracking-tight">My Calendar</h1>
      </div>
      <WeekView
        appointments={appointments}
        staff={staffForCalendar}
        services={services}
        salonId={session.salonId}
        salonSlug={slug}
        workingHours={salon.working_hours as { start: string; end: string }}
        workingDays={salon.working_days}
        initialWeekStart={weekStartStr}
        timeFormat={(salon.time_format ?? '12h') as '12h' | '24h'}
      />
    </div>
  );
}

