-- ============================================================
-- Blood Donor Finder — Phase 1 Schema
-- Run this in Supabase SQL Editor (Project > SQL Editor > New query)
-- Supabase Auth already provides: auth.users (id, email, phone,
-- email_confirmed_at, etc). We extend it with a public "profiles"
-- table (1:1 with auth.users) and a "donors" table (1:1 with
-- profiles, only for users whose role = 'donor').
-- ============================================================

-- Extension needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- ENUM types
-- ------------------------------------------------------------
do $$ begin
  create type user_role as enum ('donor', 'recipient', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type blood_group as enum ('A+','A-','B+','B-','AB+','AB-','O+','O-');
exception
  when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- PROFILES  (extends auth.users — created automatically on signup)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique,
  email         text not null,
  phone         text,
  role          user_role not null default 'recipient',
  avatar_url    text,
  is_phone_verified boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'One row per authenticated user. role decides donor/recipient/admin capabilities.';

-- ------------------------------------------------------------
-- DONORS  (only present when profiles.role = 'donor')
-- ------------------------------------------------------------
create table if not exists public.donors (
  donor_id          uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references public.profiles(user_id) on delete cascade,
  blood_group       blood_group not null,
  city              text not null,
  latitude          double precision not null,
  longitude         double precision not null,
  last_donation_date date,
  availability      boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.donors is 'Donor-specific profile data. availability is auto-derived (see trigger) but can be overridden.';

create index if not exists idx_donors_blood_group on public.donors (blood_group);
create index if not exists idx_donors_city on public.donors (city);
create index if not exists idx_donors_availability on public.donors (availability);

-- ------------------------------------------------------------
-- Auto-update updated_at
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_donors_updated_at on public.donors;
create trigger trg_donors_updated_at
  before update on public.donors
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Auto-create a profile row whenever a new auth.users row appears
-- (covers email/password, Google OAuth, everything)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, username, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 4)),
    new.email,
    new.phone
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.donors enable row level security;

-- profiles: a user can read/update only their own row; admins read all
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
  );

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id);

-- donors: readable by anyone signed in (needed for search/matching),
-- writable only by the owning user (or admin)
create policy "donors_select_authenticated"
  on public.donors for select
  to authenticated
  using (true);

create policy "donors_insert_own"
  on public.donors for insert
  with check (auth.uid() = user_id);

create policy "donors_update_own_or_admin"
  on public.donors for update
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
  );

-- ------------------------------------------------------------
-- Helper view: donors joined with profile info, and a computed
-- "eligible" flag (last donation >= 90 days ago, or never donated)
-- ------------------------------------------------------------
create or replace view public.donor_directory as
select
  d.donor_id,
  d.user_id,
  p.username,
  p.phone,
  d.blood_group,
  d.city,
  d.latitude,
  d.longitude,
  d.last_donation_date,
  d.availability,
  (d.last_donation_date is null or d.last_donation_date <= (current_date - interval '90 days')) as eligible_to_donate
from public.donors d
join public.profiles p on p.user_id = d.user_id;
