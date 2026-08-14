-- Migration: Add appointment_services junction table for multi-service bookings

create table appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  service_id uuid not null references services(id),
  created_at timestamptz not null default now(),
  unique (appointment_id, service_id)
);

create index on appointment_services (appointment_id);

alter table appointment_services enable row level security;

-- Same policy as appointments: owners manage their own
create policy "owners manage own appointment_services" on appointment_services for all
  using (
    appointment_id in (
      select a.id from appointments a
      join salons s on a.salon_id = s.id
      where s.owner_clerk_id = (auth.jwt() ->> 'sub')
    )
  )
  with check (
    appointment_id in (
      select a.id from appointments a
      join salons s on a.salon_id = s.id
      where s.owner_clerk_id = (auth.jwt() ->> 'sub')
    )
  );

-- Note: No service-role policy needed, service_role bypasses RLS
