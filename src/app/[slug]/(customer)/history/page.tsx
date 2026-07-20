import { listMyAppointments } from '@/app/actions/customer/booking';
import { cookies } from 'next/headers';
import { verifySessionCookie } from '@/lib/otp';
import { redirect } from 'next/navigation';
import type { Database } from '@/lib/supabase/types';
import Link from 'next/link';

type AppointmentWithService = Database['public']['Tables']['appointments']['Row'] & {
  services: Database['public']['Tables']['services']['Row'] | null;
};

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Redirect to sign-in if no session
  const cookieStore = await cookies();
  const token = cookieStore.get('bookease_session')?.value;
  const session = token ? await verifySessionCookie(token) : null;

  if (!session) {
    redirect(`/${slug}/sign-in`);
  }

  let appointments: AppointmentWithService[];
  try {
    appointments = await listMyAppointments(slug);
  } catch {
    appointments = [];
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>My Appointments</h1>
      <nav style={{ margin: '1rem 0' }}>
        <Link href={`/${slug}/book`}>← Book an appointment</Link>
      </nav>

      {appointments.length === 0 ? (
        <p>You have no appointments yet.</p>
      ) : (
        <ul style={{ padding: 0, listStyle: 'none' }}>
          {appointments.map((a) => {
            const isPast = new Date(a.slot_start) < new Date();
            return (
              <li
                key={a.id}
                style={{
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  border: '1px solid #eee',
                  borderRadius: '0.5rem',
                  opacity: isPast ? 0.65 : 1,
                }}
              >
                <strong>{a.services?.name ?? 'Appointment'}</strong>
                <br />
                {new Date(a.slot_start).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
                <br />
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color:
                      a.status === 'confirmed'
                        ? 'green'
                        : a.status === 'cancelled'
                        ? 'red'
                        : 'orange',
                  }}
                >
                  {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                </span>
                {a.notes && (
                  <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#666' }}>
                    {a.notes}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Placeholder for v0 history UI */}
      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px dashed #ccc' }}>
        <p>[Rich history UI — v0 component slot]</p>
      </section>
    </main>
  );
}
