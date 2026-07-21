-- ============================================================
-- Blood Donor Finder — No-Auth Schema
-- Run this in a FRESH Supabase project's SQL Editor (Project > SQL
-- Editor > New query). This replaces 001_init.sql / 002_blood_requests.sql
-- / 003_blood_banks_hospitals.sql (moved to legacy_with_auth/, kept only
-- for reference) now that the app has no user accounts at all.
--
-- There is no auth.users, no profiles table, and Row Level Security is
-- intentionally NOT enabled: the FastAPI backend always talks to Postgres
-- with the Supabase service-role key (which bypasses RLS regardless), and
-- access control now lives in application code instead:
--   - "ownership" of a donor listing / request = whoever holds its
--     owner_token, a random UUID the browser generates and sends back
--     on later edit/delete calls (see frontend/src/lib/api.js)
--   - admin actions require a shared passcode (ADMIN_PASSCODE env var),
--     not a role tied to an account
-- ============================================================

create extension if not exists "pgcrypto";

do $$ begin
  create type blood_group as enum ('A+','A-','B+','B-','AB+','AB-','O+','O-');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type request_status as enum ('pending', 'matched', 'fulfilled', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- DONORS
-- ------------------------------------------------------------
create table if not exists public.donors (
  donor_id           uuid primary key default gen_random_uuid(),
  name                text not null,
  phone               text not null,
  blood_group         blood_group not null,
  city                text not null,
  latitude            double precision not null,
  longitude           double precision not null,
  last_donation_date  date,
  availability        boolean not null default true,
  owner_token         uuid not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.donors is 'Public donor listings. owner_token (held client-side) is required to edit/delete a listing, in place of real accounts.';

create index if not exists idx_donors_blood_group on public.donors (blood_group);
create index if not exists idx_donors_city on public.donors (city);
create index if not exists idx_donors_availability on public.donors (availability);
create index if not exists idx_donors_owner_token on public.donors (owner_token);

drop trigger if exists trg_donors_updated_at on public.donors;
create trigger trg_donors_updated_at
  before update on public.donors
  for each row execute function public.set_updated_at();

-- Eligible = never donated, or last donation >= 90 days ago
create or replace view public.donor_directory as
select
  d.donor_id,
  d.name,
  d.phone,
  d.blood_group,
  d.city,
  d.latitude,
  d.longitude,
  d.last_donation_date,
  d.availability,
  (d.last_donation_date is null or d.last_donation_date <= (current_date - interval '90 days')) as eligible_to_donate
from public.donors d;

-- ------------------------------------------------------------
-- BLOOD REQUESTS
-- ------------------------------------------------------------
create table if not exists public.blood_requests (
  request_id        uuid primary key default gen_random_uuid(),
  patient_name       text not null,
  blood_group        blood_group not null,
  units_required     integer not null check (units_required > 0),
  hospital_name      text not null,
  city               text not null,
  latitude           double precision not null,
  longitude          double precision not null,
  status             request_status not null default 'pending',
  notes              text,
  requester_name     text not null,
  requester_phone    text not null,
  owner_token        uuid not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.blood_requests is 'A request for blood, raised by anyone. owner_token gates edits/cancellation the same way it does for donors.';

create index if not exists idx_requests_blood_group on public.blood_requests (blood_group);
create index if not exists idx_requests_status on public.blood_requests (status);
create index if not exists idx_requests_owner_token on public.blood_requests (owner_token);

drop trigger if exists trg_requests_updated_at on public.blood_requests;
create trigger trg_requests_updated_at
  before update on public.blood_requests
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- BLOOD BANKS
-- ------------------------------------------------------------
create table if not exists public.blood_banks (
  bank_id                 uuid primary key default gen_random_uuid(),
  name                    text not null,
  address                 text not null,
  contact_number          text not null,
  city                    text not null,
  latitude                double precision,
  longitude               double precision,
  available_blood_groups  blood_group[] not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_blood_banks_city on public.blood_banks (city);
create index if not exists idx_blood_banks_groups on public.blood_banks using gin (available_blood_groups);

drop trigger if exists trg_blood_banks_updated_at on public.blood_banks;
create trigger trg_blood_banks_updated_at
  before update on public.blood_banks
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- HOSPITALS
-- ------------------------------------------------------------
create table if not exists public.hospitals (
  hospital_id       uuid primary key default gen_random_uuid(),
  name              text not null,
  address           text not null,
  emergency_contact text not null,
  city              text not null,
  latitude          double precision,
  longitude         double precision,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_hospitals_city on public.hospitals (city);

drop trigger if exists trg_hospitals_updated_at on public.hospitals;
create trigger trg_hospitals_updated_at
  before update on public.hospitals
  for each row execute function public.set_updated_at();

-- Row Level Security is deliberately left disabled on all four tables —
-- see the note at the top of this file for why.
