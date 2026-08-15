import { getPublicServices } from '@/app/actions/customer/services';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { cookies } from 'next/headers';
import { verifySessionCookie } from '@/lib/otp';
import { BookingFlow } from '@/components/customer/booking-flow';
import type { StaffRow, SalonRow } from '@/lib/supabase/types';

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const initialParams = {
    serviceId: typeof sp.serviceId === 'string' ? sp.serviceId : undefined,
    staffId: typeof sp.staffId === 'string' ? sp.staffId : undefined,
    date: typeof sp.date === 'string' ? sp.date : undefined,
    slotStart: typeof sp.slotStart === 'string' ? sp.slotStart : undefined,
    slotEnd: typeof sp.slotEnd === 'string' ? sp.slotEnd : undefined,
    time: typeof sp.time === 'string' ? sp.time : undefined,
  };

  // Determine if the customer is signed in (no redirect — sign-in is optional until submit)
  const cookieStore = await cookies();
  const token = cookieStore.get('bookmi_session')?.value;
  const session = token ? await verifySessionCookie(token) : null;
  const isSignedIn = Boolean(session);

  // Public reads — no session needed
  const supabase = createServiceSupabaseClient();

  const { data: salonData } = await supabase
    .from('salons')
    .select('id, name, working_hours')
    .eq('slug', slug)
    .single();
  const salon = salonData as SalonRow | null;

  if (!salon) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <p className="text-sm text-muted-foreground">Salon not found.</p>
      </div>
    );
  }

  // Fetch services (public) and staff (public read via service role)
  const [services, staffResult] = await Promise.all([
    getPublicServices(slug),
    supabase
      .from('staff')
      .select('*')
      .eq('salon_id', salon.id)
      .order('name'),
  ]);

  const staff = (staffResult.data ?? []) as StaffRow[];

  return (
    <div className="max-w-lg mx-auto">
      <BookingFlow
        slug={slug}
        services={services}
        staff={staff}
        isSignedIn={isSignedIn}
        initialParams={initialParams}
        workingHours={salon.working_hours as { start: string; end: string }}
      />
    </div>
  );
}
