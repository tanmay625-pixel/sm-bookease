-- ============================================================
-- BookMi (sm-bookease) — Complete Consolidated Supabase Schema
-- Run this in the SQL Editor of your NEW Supabase project.
-- ============================================================

-- 1. Extensions
create extension if not exists "pgcrypto";

-- 2. Enums
do $$ begin
  create type appointment_status as enum ('pending', 'confirmed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

-- 3. Tables

-- salons
create table if not exists salons (
  id uuid primary key default gen_random_uuid(),
  owner_clerk_id text not null,
  name text not null,
  slug text not null unique,
  working_hours jsonb not null default '{"start":"09:00","end":"19:00"}',
  working_days text[] not null default array['mon','tue','wed','thu','fri','sat'],
  time_format text not null default '12h',
  created_at timestamptz not null default now()
);
create index if not exists idx_salons_owner on salons (owner_clerk_id);

-- staff
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);
create index if not exists idx_staff_salon on staff (salon_id);

-- services
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  name text not null,
  duration_minutes int not null,
  price numeric(10,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_services_salon on services (salon_id);

-- customers
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  created_at timestamptz not null default now(),
  unique (salon_id, phone)
);
create index if not exists idx_customers_salon on customers (salon_id);

-- appointments
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  service_id uuid not null references services(id),
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  status appointment_status not null default 'pending',
  notes text,
  created_by text not null default 'customer',
  created_at timestamptz not null default now()
);
create index if not exists idx_appointments_salon_slot on appointments (salon_id, slot_start);
create index if not exists idx_appointments_customer on appointments (customer_id);

-- appointment_services (junction table for multi-service bookings)
create table if not exists appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  service_id uuid not null references services(id),
  created_at timestamptz not null default now(),
  unique (appointment_id, service_id)
);
create index if not exists idx_appointment_services_appointment on appointment_services (appointment_id);

-- otp_codes (service-role only)
create table if not exists otp_codes (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_otp_codes_salon_phone on otp_codes (salon_id, phone);

-- message_log (service-role only)
create table if not exists message_log (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete set null,
  phone text,
  template_name text,
  direction text not null default 'outbound',
  status text,
  wa_message_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- 4. Enable Row Level Security (RLS) on all tables
alter table salons enable row level security;
alter table staff enable row level security;
alter table services enable row level security;
alter table customers enable row level security;
alter table appointments enable row level security;
alter table appointment_services enable row level security;
alter table otp_codes enable row level security;
alter table message_log enable row level security;

-- 5. RLS Policies (Owner access via Clerk JWT sub)
-- Note: Requires Clerk configured under Supabase Authentication -> Third-Party Auth.

drop policy if exists "owners manage own salon" on salons;
create policy "owners manage own salon" on salons for all
  using (owner_clerk_id = (auth.jwt() ->> 'sub'))
  with check (owner_clerk_id = (auth.jwt() ->> 'sub'));

drop policy if exists "owners manage own staff" on staff;
create policy "owners manage own staff" on staff for all
  using (
    salon_id in (
      select id from salons where owner_clerk_id = (auth.jwt() ->> 'sub')
    )
  )
  with check (
    salon_id in (
      select id from salons where owner_clerk_id = (auth.jwt() ->> 'sub')
    )
  );

drop policy if exists "owners manage own services" on services;
create policy "owners manage own services" on services for all
  using (
    salon_id in (
      select id from salons where owner_clerk_id = (auth.jwt() ->> 'sub')
    )
  )
  with check (
    salon_id in (
      select id from salons where owner_clerk_id = (auth.jwt() ->> 'sub')
    )
  );

drop policy if exists "owners manage own customers" on customers;
create policy "owners manage own customers" on customers for all
  using (
    salon_id in (
      select id from salons where owner_clerk_id = (auth.jwt() ->> 'sub')
    )
  )
  with check (
    salon_id in (
      select id from salons where owner_clerk_id = (auth.jwt() ->> 'sub')
    )
  );

drop policy if exists "owners manage own appointments" on appointments;
create policy "owners manage own appointments" on appointments for all
  using (
    salon_id in (
      select id from salons where owner_clerk_id = (auth.jwt() ->> 'sub')
    )
  )
  with check (
    salon_id in (
      select id from salons where owner_clerk_id = (auth.jwt() ->> 'sub')
    )
  );

drop policy if exists "owners manage own appointment_services" on appointment_services;
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

