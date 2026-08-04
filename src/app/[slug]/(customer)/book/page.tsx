import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { getAvailableSlots } from '@/app/actions/customer/booking';
import { cookies } from 'next/headers';
import { verifySessionCookie } from '@/lib/otp';
import type { Database } from '@/lib/supabase/types';
import Link from 'next/link';
import BookSlots from './BookSlots';

type ServiceRow = Database['public']['Tables']['services']['Row'];
type StaffRow = Database['public']['Tables']['staff']['Row'];

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ serviceId?: string; staffId?: string; date?: string }>;
}) {
  const { slug } = await params;
  const { serviceId, staffId, date } = await searchParams;

  // Session is optional on this page: browsing services and slots is public.
  // createAppointmentAsCustomer enforces auth server-side inside BookSlots.
  // We read the cookie here only so we can pass isSignedIn down to BookSlots
  // to decide whether to show slot buttons or a sign-in prompt.
  const cookieStore = await cookies();
  const token = cookieStore.get('bookease_session')?.value;
  const session = token ? await verifySessionCookie(token) : null;
  const isSignedIn = session !== null;

  const supabase = createServiceSupabaseClient();

  const { data: salonData } = await supabase
    .from('salons')
    .select('id, name')
    .eq('slug', slug)
    .single();

  const salon = salonData as { id: string; name: string } | null;

  const { data: servicesData } = await supabase
    .from('services')
    .select('*')
    .eq('salon_id', salon?.id ?? '')
    .order('name');

  const { data: staffData } = await supabase
    .from('staff')
    .select('*')
    .eq('salon_id', salon?.id ?? '');

  const services = (servicesData ?? []) as ServiceRow[];
  const staffList = (staffData ?? []) as StaffRow[];

  // Compute slots if a service + date are selected (public, no session required)
  const slots =
    salon && serviceId && date
      ? await getAvailableSlots(slug, serviceId, staffId ?? 'any', date).catch(
          () => []
        )
      : [];

  const today = new Date().toISOString().split('T')[0];

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>{salon?.name} — Book an Appointment</h1>
      <nav style={{ margin: '1rem 0' }}>
        <Link href={`/${slug}/history`}>My Appointments →</Link>
      </nav>

      {/* Step 1 — select service */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2>1. Choose a service</h2>
        <form>
          <input type="hidden" name="staffId" value={staffId ?? 'any'} />
          <input type="hidden" name="date" value={date ?? today} />
          <select name="serviceId" defaultValue={serviceId}>
            <option value="">Select a service…</option>
            {(services ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.duration_minutes}min — ₹{s.price}
              </option>
            ))}
          </select>
          <button type="submit" style={{ marginLeft: '0.5rem' }}>Next</button>
        </form>
      </section>

      {/* Step 2 — select staff and date */}
      {serviceId && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h2>2. Choose staff &amp; date</h2>
          <form>
            <input type="hidden" name="serviceId" value={serviceId} />
            <select name="staffId" defaultValue={staffId ?? 'any'}>
              <option value="any">Any available</option>
              {(staffList ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input
              type="date"
              name="date"
              defaultValue={date ?? today}
              min={today}
              style={{ margin: '0 0.5rem' }}
            />
            <button type="submit">Show slots</button>
          </form>
        </section>
      )}

      {/* Step 3 — select slot (client component — calls createAppointmentAsCustomer directly) */}
      {slots.length > 0 && (
        <section>
          <h2>3. Choose a slot</h2>
          <BookSlots
            slug={slug}
            serviceId={serviceId!}
            staffId={staffId ?? 'any'}
            slots={slots}
            isSignedIn={isSignedIn}
          />
        </section>
      )}

      {serviceId && date && slots.length === 0 && (
        <p>No available slots for this date. Try a different date or staff member.</p>
      )}

      {/* Placeholder for v0 booking UI */}
      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px dashed #ccc' }}>
        <p>[Rich booking UI — v0 component slot]</p>
      </section>
    </main>
  );
}
