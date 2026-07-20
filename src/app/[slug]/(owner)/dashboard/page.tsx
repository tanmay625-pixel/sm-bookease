import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { listAppointments } from '@/app/actions/owner/appointments';
import { UserButton } from '@clerk/nextjs';
import type { SalonRow } from '@/lib/supabase/types';
import Link from 'next/link';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createClerkSupabaseClient();

  const { data: salonData } = await supabase
    .from('salons')
    .select('id, name')
    .eq('slug', slug)
    .single();
  const salon = salonData as SalonRow | null;

  const today = new Date().toISOString().split('T')[0];
  const appointments = salon
    ? await listAppointments(salon.id, {
        dateFrom: `${today}T00:00:00`,
        dateTo: `${today}T23:59:59`,
      })
    : [];

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{salon?.name ?? slug} — Dashboard</h1>
        <UserButton />
      </header>

      <nav style={{ margin: '1rem 0', display: 'flex', gap: '1rem' }}>
        <Link href={`/${slug}/appointments`}>Appointments</Link>
        <Link href={`/${slug}/clients`}>Clients</Link>
        <Link href={`/${slug}/settings`}>Settings</Link>
      </nav>

      <section>
        <h2>Today&apos;s Appointments ({appointments.length})</h2>
        {appointments.length === 0 ? (
          <p>No appointments today.</p>
        ) : (
          <ul>
            {appointments.map((a) => (
              <li key={a.id}>
                {new Date(a.slot_start).toLocaleTimeString()} —{' '}
                {a.customers?.name ?? 'Unknown'} ({a.status})
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Placeholder for real-time day schedule — UI component goes here */}
      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px dashed #ccc' }}>
        <p>[Day schedule calendar — v0 component slot]</p>
      </section>
    </main>
  );
}
