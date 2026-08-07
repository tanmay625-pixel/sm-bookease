-- ============================================================
-- BookMi — Supabase Schema
-- Run in Supabase SQL editor. Read every RLS policy before executing.
-- ============================================================

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Core tables
-- ─────────────────────────────────────────────

create table salons (
  id uuid primary key default gen_random_uuid(),
  owner_clerk_id text not null,          -- Clerk user ID (text, not uuid)
  name text not null,
  slug text not null unique,
  working_hours jsonb not null default '{"start":"09:00","end":"19:00"}',
  working_days text[] not null default array['mon','tue','wed','thu','fri','sat'],
  created_at timestamptz not null default now()
);
create index on salons (owner_clerk_id);

create table staff (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  name text not null,
  duration_minutes int not null,
  price numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  created_at timestamptz not null default now(),
  unique (salon_id, phone)
);

create type appointment_status as enum ('pending', 'confirmed', 'cancelled');

create table appointments (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  service_id uuid not null references services(id),
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  status appointment_status not null default 'pending',
  notes text,
  created_by text not null default 'customer', -- 'customer' or the owner's Clerk ID
  created_at timestamptz not null default now()
);
create index on appointments (salon_id, slot_start);
create index on appointments (customer_id);

-- ─────────────────────────────────────────────
-- OTP codes
-- service-role only: RLS enabled, zero policies
-- default-deny for anon/authenticated; service-role bypasses regardless
-- ─────────────────────────────────────────────

create table otp_codes (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  phone text not null,
  code_hash text not null,      -- SHA-256 hex of the 6-digit code (never plaintext)
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on otp_codes (salon_id, phone);
alter table otp_codes enable row level security;
-- no policies — default-deny for all non-service-role roles

-- ─────────────────────────────────────────────
-- WhatsApp message log
-- service-role only: RLS enabled, zero policies
-- ─────────────────────────────────────────────

create table message_log (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete set null,
  phone text,
  template_name text,
  direction text not null default 'outbound',  -- 'outbound' | 'inbound'
  status text,        -- 'sent', 'delivered', 'read', 'failed', or inbound event type
  wa_message_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);
alter table message_log enable row level security;
-- no policies — default-deny for all non-service-role roles
-- NOTE: disabling RLS would leave this table readable via the public publishable key.
-- Enabling with no policies gives default-deny without breaking service-role access.

-- ─────────────────────────────────────────────
-- Enable RLS on all core tables
-- ─────────────────────────────────────────────

alter table salons enable row level security;
alter table staff enable row level security;
alter table services enable row level security;
alter table customers enable row level security;
alter table appointments enable row level security;

-- ─────────────────────────────────────────────
-- RLS Policies (owner side via Clerk JWT)
--
-- IMPORTANT: auth.jwt() ->> 'sub' returns the Clerk user ID (a text string).
-- NEVER use auth.uid() here — it expects a UUID and will silently fail to match
-- Clerk's string-format user IDs.
--
-- Requires: Clerk configured as a Third-Party Auth provider in Supabase
-- (Authentication → Third-Party Auth → Clerk in the Supabase dashboard).
-- ─────────────────────────────────────────────

create policy "owners manage own salon" on salons for all
  using (owner_clerk_id = (auth.jwt() ->> 'sub'))
  with check (owner_clerk_id = (auth.jwt() ->> 'sub'));

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
