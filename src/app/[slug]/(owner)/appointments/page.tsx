import { createClerkSupabaseClient } from '@/lib/supabase/server';
import {
  listAppointments,
} from '@/app/actions/owner/appointments';
import { listStaff } from '@/app/actions/owner/staff';
import { listServices } from '@/app/actions/owner/services';
import type { SalonRow, AppointmentStatus } from '@/lib/supabase/types';
import { AppointmentCardWithDetails } from '@/components/owner/appointment-card-with-details';
import { AppointmentStatusActions } from '@/components/owner/appointment-status-actions';
import { FilterBar } from '@/components/owner/filter-bar';
import { NewAppointmentTrigger } from '../dashboard/NewAppointmentTrigger';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function AppointmentsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    staffId?: string;
    search?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const supabase = createClerkSupabaseClient();
  const { data: salonData } = await supabase
    .from('salons')
    .select('id, name, working_hours')
    .eq('slug', slug)
    .single();
  const salon = salonData as SalonRow | null;

  const validStatuses: AppointmentStatus[] = ['pending', 'confirmed', 'cancelled'];
  const statusFilter =
    sp.status && validStatuses.includes(sp.status as AppointmentStatus)
      ? (sp.status as AppointmentStatus)
      : undefined;

  const [appointments, staff, services] = salon
    ? await Promise.all([
        listAppointments(salon.id, {
          dateFrom: sp.dateFrom ? `${sp.dateFrom}T00:00:00Z` : undefined,
          dateTo:   sp.dateTo   ? `${sp.dateTo}T23:59:59Z`   : undefined,
          status:   statusFilter,
          staffId:  sp.staffId !== 'all' ? sp.staffId : undefined,
          search:   sp.search,
        }),
        listStaff(salon.id),
        listServices(salon.id),
      ])
    : [[], [], []];

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Appointments</h1>
        {salon && (
          <NewAppointmentTrigger
            salonId={salon.id}
            salonSlug={slug}
            staff={staff}
            services={services}
            workingHours={salon.working_hours as { start: string; end: string }}
          />
        )}
      </div>

      {/* Filter bar */}
      <Suspense>
        <FilterBar staff={staff} />
      </Suspense>

      {/* Results */}
      <Suspense fallback={<AppointmentsSkeleton />}>
        {appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No appointments match your filters.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              {appointments.length} result{appointments.length !== 1 ? 's' : ''}
            </p>
            {appointments.map((a) => (
              <AppointmentCardWithDetails
                key={a.id}
                appointment={a}
                salonId={salon?.id}
                salonSlug={slug}
                staff={staff}
                services={services}
                workingHours={salon?.working_hours as { start: string; end: string } | undefined}
                actions={
                  salon && a.status !== 'cancelled' ? (
                    <AppointmentStatusActions
                      appointment={a}
                      slug={slug}
                      salonId={salon.id}
                      staff={staff}
                      services={services}
                      workingHours={salon.working_hours as { start: string; end: string }}
                    />
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </Suspense>
    </div>
  );
}
