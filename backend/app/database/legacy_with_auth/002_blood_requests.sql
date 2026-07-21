-- ============================================================
-- Blood Donor Finder — Phase 2 Schema
-- Run this AFTER schema.sql (Phase 1), in the Supabase SQL Editor.
-- Adds: blood_requests table, status enum, RLS policies.
-- ============================================================

do $$ begin
  create type request_status as enum ('pending', 'matched', 'fulfilled', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.blood_requests (
  request_id        uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.profiles(user_id) on delete cascade,
  patient_name      text not null,
  blood_group       blood_group not null,
  units_required    integer not null check (units_required > 0),
  hospital_name     text not null,
  city              text not null,
  latitude          double precision not null,
  longitude         double precision not null,
  status            request_status not null default 'pending',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.blood_requests is
  'A recipient''s request for blood. latitude/longitude are the hospital/patient location used for donor matching.';

create index if not exists idx_requests_blood_group on public.blood_requests (blood_group);
create index if not exists idx_requests_status on public.blood_requests (status);
create index if not exists idx_requests_requester on public.blood_requests (requester_user_id);

drop trigger if exists trg_requests_updated_at on public.blood_requests;
create trigger trg_requests_updated_at
  before update on public.blood_requests
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.blood_requests enable row level security;

-- Anyone signed in can raise a request for themselves
create policy "requests_insert_own"
  on public.blood_requests for insert
  with check (auth.uid() = requester_user_id);

-- A requester sees their own requests in full. Any authenticated user
-- (donors browsing for someone to help) can see requests that are still
-- open (pending/matched) so they know where blood is needed. Admins see
-- everything, including fulfilled/cancelled, for reporting.
create policy "requests_select_own_open_or_admin"
  on public.blood_requests for select
  to authenticated
  using (
    auth.uid() = requester_user_id
    or status in ('pending', 'matched')
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
  );

-- Only the requester (e.g. cancel, edit units) or an admin can update a request
create policy "requests_update_own_or_admin"
  on public.blood_requests for update
  using (
    auth.uid() = requester_user_id
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
  );

create policy "requests_delete_own_or_admin"
  on public.blood_requests for delete
  using (
    auth.uid() = requester_user_id
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
  );
