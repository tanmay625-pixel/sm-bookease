import { getClientDetail } from '@/app/actions/owner/appointments';
import Link from 'next/link';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string; clientId: string }>;
}) {
  const { slug, clientId } = await params;

  let client;
  try {
    client = await getClientDetail(clientId);
  } catch {
    return (
      <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Client not found</h1>
        <Link href={`/${slug}/clients`}>← Back to clients</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <nav style={{ marginBottom: '1rem' }}>
        <Link href={`/${slug}/clients`}>← Back to clients</Link>
      </nav>

      <h1>{client.name}</h1>
      <dl>
        <dt>Phone</dt><dd>{client.phone}</dd>
        <dt>Email</dt><dd>{client.email ?? '—'}</dd>
        <dt>Customer since</dt>
        <dd>{new Date(client.created_at).toLocaleDateString()}</dd>
      </dl>

      <h2 style={{ marginTop: '2rem' }}>Appointment History</h2>
      {client.appointments.length === 0 ? (
        <p>No appointments yet.</p>
      ) : (
        <ul>
          {client.appointments
            .sort((a, b) => new Date(b.slot_start).getTime() - new Date(a.slot_start).getTime())
            .map((a) => (
              <li key={a.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                {new Date(a.slot_start).toLocaleString()} — {a.status}
                {a.notes && <em> ({a.notes})</em>}
              </li>
            ))}
        </ul>
      )}
    </main>
  );
}
