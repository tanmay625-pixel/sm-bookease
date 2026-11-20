import { requireStaffSession } from '@/lib/staff-session';
import { listStaffAppointments } from '@/app/actions/staff/appointments';
import { listServices } from '@/app/actions/owner/services';
import { listStaff } from '@/app/actions/owner/staff';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { TokenStubCard } from '@/components/token-stub-card';
import { StaffAppointmentStatusActions } from '@/components/staff/staff-appointment-status-actions';
import { StaffNewAppointmentTrigger } from '@/components/staff/staff-new-appointment-trigger';
import { FilterBar } from '@/components/owner/filter-bar';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { SalonRow, AppointmentStatus } from '@/lib/supabase/types';

function AppointmentsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

export default async function StaffAppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; dateFrom?: string; dateTo?: string; search?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await requireStaffSession(slug);

  const supabase = createServiceSupabaseClient();
  const { data: salonData } = await supabase.from('salons').select('*').eq('id', session.salonId).single();
  const salon = salonData as SalonRow | null;

  const validStatuses: AppointmentStatus[] = ['pending', 'confirmed', 'cancelled'];
  const statusFilter =
    sp.status && validStatuses.includes(sp.status as AppointmentStatus)
      ? (sp.status as AppointmentStatus)
      : undefined;

  const [appointments, services, allStaff] = await Promise.all([
    listStaffAppointments(slug, {
      dateFrom: sp.dateFrom ? `${sp.dateFrom}T00:00:00Z` : undefined,
      dateTo:   sp.dateTo   ? `${sp.dateTo}T23:59:59Z`   : undefined,
      status:   statusFilter,
      search:   sp.search,
    }),
    listServices(session.salonId),
    listStaff(session.salonId),
  ]);

  const wh = (salon?.working_hours ?? { start: '09:00', end: '19:00' }) as { start: string; end: string };
  const myStaffRow = allStaff.find((s) => s.id === session.staffId);
  const staffForModal = myStaffRow ? [myStaffRow] : allStaff;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background pb-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">My Appointments</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
            </p>
          </div>
          <StaffNewAppointmentTrigger
            slug={slug}
            salonId={session.salonId}
            staffId={session.staffId}
            staff={staffForModal}
            services={services}
            workingHours={wh}
            timeFormat={(salon?.time_format ?? '12h') as '12h' | '24h'}
          />
        </div>
        {/* FilterBar without staff filter (staff is locked to self) */}
        <Suspense>
          <FilterBar staff={[]} />
        </Suspense>
      </div>

      {/* Appointments list */}
      <Suspense fallback={<AppointmentsSkeleton />}>
        {appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">No appointments found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {appointments.map((appt) => (
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
                    timeFormat={(salon?.time_format ?? '12h') as '12h' | '24h'}
                  />
                }
              />
            ))}
          </div>
        )}
      </Suspense>
    </div>
  );
}

