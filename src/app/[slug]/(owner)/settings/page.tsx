import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { listStaff, createStaff, deleteStaff } from '@/app/actions/owner/staff';
import { listServices, createService, deleteService } from '@/app/actions/owner/services';
import { updateSalonSettings } from '@/app/actions/owner/salon';
import type { SalonRow } from '@/lib/supabase/types';
import Link from 'next/link';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createClerkSupabaseClient();

  const { data: salonData } = await supabase
    .from('salons')
    .select('*')
    .eq('slug', slug)
    .single();
  const salon = salonData as SalonRow | null;

  const [staffList, servicesList] = await Promise.all([
    salon ? listStaff(salon.id) : Promise.resolve([]),
    salon ? listServices(salon.id) : Promise.resolve([]),
  ]);

  if (!salon) {
    return <main style={{ padding: '2rem' }}><p>Salon not found.</p></main>;
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>{salon.name} — Settings</h1>
      <nav style={{ margin: '1rem 0' }}>
        <Link href={`/${slug}/dashboard`}>← Dashboard</Link>
      </nav>

      {/* ── Salon general settings ── */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>General</h2>
        <form
          action={async (formData: FormData) => {
            'use server';
            const name = formData.get('name') as string;
            const start = formData.get('start') as string;
            const end = formData.get('end') as string;
            await updateSalonSettings(salon.id, {
              name,
              workingHours: { start, end },
            });
          }}
        >
          <label>
            Salon name
            <input name="name" defaultValue={salon.name} required style={{ display: 'block', marginBottom: '0.5rem' }} />
          </label>
          <label>
            Working hours start
            <input name="start" type="time" defaultValue={(salon.working_hours as { start: string }).start} style={{ display: 'block', marginBottom: '0.5rem' }} />
          </label>
          <label>
            Working hours end
            <input name="end" type="time" defaultValue={(salon.working_hours as { end: string }).end} style={{ display: 'block', marginBottom: '0.5rem' }} />
          </label>
          <button type="submit">Save</button>
        </form>
      </section>

      {/* ── Staff ── */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Staff ({staffList.length})</h2>
        <ul>
          {staffList.map((s) => (
            <li key={s.id} style={{ display: 'flex', gap: '1rem', padding: '0.25rem 0' }}>
              <span>{s.name} {s.role ? `(${s.role})` : ''}</span>
              <form
                action={async () => {
                  'use server';
                  await deleteStaff(s.id);
                }}
              >
                <button type="submit">Remove</button>
              </form>
            </li>
          ))}
        </ul>
        <form
          style={{ marginTop: '1rem' }}
          action={async (formData: FormData) => {
            'use server';
            const name = formData.get('name') as string;
            const role = formData.get('role') as string;
            await createStaff(salon.id, { name, role: role || null, email: null, phone: null });
          }}
        >
          <input name="name" placeholder="Staff name" required style={{ marginRight: '0.5rem' }} />
          <input name="role" placeholder="Role (optional)" style={{ marginRight: '0.5rem' }} />
          <button type="submit">Add Staff</button>
        </form>
      </section>

      {/* ── Services ── */}
      <section>
        <h2>Services ({servicesList.length})</h2>
        <ul>
          {servicesList.map((s) => (
            <li key={s.id} style={{ display: 'flex', gap: '1rem', padding: '0.25rem 0' }}>
              <span>{s.name} — {s.duration_minutes}min — ₹{s.price}</span>
              <form
                action={async () => {
                  'use server';
                  await deleteService(s.id);
                }}
              >
                <button type="submit">Remove</button>
              </form>
            </li>
          ))}
        </ul>
        <form
          style={{ marginTop: '1rem' }}
          action={async (formData: FormData) => {
            'use server';
            await createService(salon.id, {
              name: formData.get('name') as string,
              duration_minutes: parseInt(formData.get('duration') as string, 10),
              price: parseFloat(formData.get('price') as string),
            });
          }}
        >
          <input name="name" placeholder="Service name" required style={{ marginRight: '0.5rem' }} />
          <input name="duration" type="number" placeholder="Duration (min)" required style={{ width: '7rem', marginRight: '0.5rem' }} />
          <input name="price" type="number" step="0.01" placeholder="Price (₹)" required style={{ width: '7rem', marginRight: '0.5rem' }} />
          <button type="submit">Add Service</button>
        </form>
      </section>
    </main>
  );
}
