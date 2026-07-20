import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { listClients } from '@/app/actions/owner/appointments';
import type { SalonRow } from '@/lib/supabase/types';
import Link from 'next/link';

export default async function ClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ search?: string }>;
}) {
  const { slug } = await params;
  const { search } = await searchParams;

  const supabase = createClerkSupabaseClient();
  const { data: salonData } = await supabase
    .from('salons')
    .select('id, name')
    .eq('slug', slug)
    .single();
  const salon = salonData as SalonRow | null;

  const clients = salon ? await listClients(salon.id, search) : [];

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>{salon?.name} — Clients</h1>
      <nav style={{ margin: '1rem 0' }}>
        <Link href={`/${slug}/dashboard`}>← Dashboard</Link>
      </nav>

      {/* Search — placeholder for v0 UI */}
      <section style={{ marginBottom: '1rem', padding: '1rem', border: '1px dashed #ccc' }}>
        <p>[Search by name / phone — v0 component slot]</p>
      </section>

      <ul>
        {clients.length === 0 ? (
          <li>No clients found.</li>
        ) : (
          clients.map((c) => (
            <li key={c.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              <Link href={`/${slug}/clients/${c.id}`}>
                <strong>{c.name}</strong> — {c.phone}
              </Link>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
