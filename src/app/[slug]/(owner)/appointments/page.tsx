import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { listAppointments, updateAppointmentStatus } from '@/app/actions/owner/appointments';
import type { SalonRow } from '@/lib/supabase/types';
import Link from 'next/link';

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; date?: string }>;
}) {
  const { slug } = await params;
  const { status, date } = await searchParams;

  const supabase = createClerkSupabaseClient();
  const { data: salonData } = await supabase
    .from('salons')
    .select('id, name')
    .eq('slug', slug)
    .single();
  const salon = salonData as SalonRow | null;

  const appointments = salon
    ? await listAppointments(salon.id, {
        status: status as 'pending' | 'confirmed' | 'cancelled' | undefined,
        dateFrom: date ? `${date}T00:00:00` : undefined,
        dateTo: date ? `${date}T23:59:59` : undefined,
      })
    : [];

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>{salon?.name} — Appointments</h1>
      <nav style={{ margin: '1rem 0' }}>
        <Link href={`/${slug}/dashboard`}>← Dashboard</Link>
      </nav>

      {/* Filter controls — placeholder for v0 UI */}
      <section style={{ marginBottom: '1rem', padding: '1rem', border: '1px dashed #ccc' }}>
        <p>[Filters: date, status, staff, search — v0 component slot]</p>
      </section>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Time</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Customer</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {appointments.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: '1rem' }}>No appointments found.</td>
            </tr>
          ) : (
            appointments.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>
                  {new Date(a.slot_start).toLocaleString()}
                </td>
                <td style={{ padding: '0.5rem' }}>
                  {a.customers?.name ?? '—'} {a.customers?.phone ?? ''}
                </td>
                <td style={{ padding: '0.5rem' }}>{a.status}</td>
                <td style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  {a.status === 'pending' && (
                    <>
                      {/* Server actions bound to form buttons */}
                      <form
                        action={async () => {
                          'use server';
                          await updateAppointmentStatus(a.id, 'confirmed');
                        }}
                      >
                        <button type="submit">Confirm</button>
                      </form>
                      <form
                        action={async () => {
                          'use server';
                          await updateAppointmentStatus(a.id, 'cancelled');
                        }}
                      >
                        <button type="submit">Cancel</button>
                      </form>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}
