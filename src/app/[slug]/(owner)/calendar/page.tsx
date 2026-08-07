import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { listAppointments } from '@/app/actions/owner/appointments';
import { listStaff } from '@/app/actions/owner/staff';
import { listServices } from '@/app/actions/owner/services';
import { getSalonBySlug } from '@/app/actions/owner/salon';
import { WeekView } from '@/components/calendar/week-view';

/**
 * Calendar page shell.
 *
 * Fetches salon, staff, services, and the current week's appointments,
 * then hands everything to the self-contained WeekView client component.
 *
 * The WeekView handles its own week navigation, staff filtering, and
 * appointment create/edit via NewAppointmentModal.
 */
export default async function CalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">Salon not found.</p>
      </div>
    );
  }

  // Compute Monday of the current week (ISO week starts on Monday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun … 6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const weekStartStr = monday.toISOString().split('T')[0];

  // Fetch a wider window (Mon–Sun) of appointments for the initial render
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekEndStr = sunday.toISOString().split('T')[0];

  const [appointments, staff, services] = await Promise.all([
    listAppointments(salon.id, {
      dateFrom: `${weekStartStr}T00:00:00`,
      dateTo: `${weekEndStr}T23:59:59`,
    }),
    listStaff(salon.id),
    listServices(salon.id),
  ]);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5 h-full">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
      </div>
      <WeekView
        appointments={appointments}
        staff={staff}
        services={services}
        salonId={salon.id}
        salonSlug={slug}
        workingHours={salon.working_hours}
        workingDays={salon.working_days}
        initialWeekStart={weekStartStr}
      />
    </div>
  );
}
