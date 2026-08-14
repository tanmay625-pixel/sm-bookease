import { listMyAppointments } from '@/app/actions/customer/booking';
import { cookies } from 'next/headers';
import { verifySessionCookie } from '@/lib/otp';
import { redirect } from 'next/navigation';
import { CustomerAppointmentItem } from '@/components/customer/customer-appointment-item';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AppointmentRow, ServiceRow } from '@/lib/supabase/types';
import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AppointmentWithService = AppointmentRow & { 
  services: ServiceRow | null;
  staff?: any;
  appointment_services?: { services: ServiceRow | null }[];
};

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Redirect to sign-in if no session
  const cookieStore = await cookies();
  const token = cookieStore.get('bookmi_session')?.value;
  const session = token ? await verifySessionCookie(token) : null;

  if (!session) {
    redirect(`/${slug}/sign-in`);
  }

  let appointments: AppointmentWithService[] = [];
  let loadError: string | null = null;
  try {
    appointments = await listMyAppointments(slug);
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Could not load appointments.';
  }

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => new Date(a.slot_start) >= now && a.status !== 'cancelled'
  );
  const past = appointments.filter(
    (a) => new Date(a.slot_start) < now || a.status === 'cancelled'
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">My Appointments</h1>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href={`/${slug}/book`}>
            <CalendarCheck className="size-3.5" />
            Book
          </Link>
        </Button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <CalendarCheck className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No appointments yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap Book to get started.
            </p>
          </div>
          <Button asChild>
            <Link href={`/${slug}/book`}>Book an appointment</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                Upcoming
                <Badge variant="outline" className="text-xs">{upcoming.length}</Badge>
              </h2>
              <div className="flex flex-col gap-3">
                {upcoming.map((a) => (
                  <CustomerAppointmentItem
                    key={a.id}
                    slug={slug}
                    appointment={a}
                    isUpcoming
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <>
              {upcoming.length > 0 && <Separator />}
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  Past
                  <Badge variant="outline" className="text-xs">{past.length}</Badge>
                </h2>
                <div className="flex flex-col gap-2">
                  {past.map((a) => (
                    <CustomerAppointmentItem
                      key={a.id}
                      slug={slug}
                      appointment={a}
                      isUpcoming={false}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
