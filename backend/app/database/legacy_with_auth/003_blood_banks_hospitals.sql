-- ============================================================
-- Blood Donor Finder — Phase 3 Schema
-- Run this AFTER 001_init.sql and 002_blood_requests.sql.
-- Adds: blood_banks, hospitals — read by anyone signed in,
-- written only by admins.
-- ============================================================

create table if not exists public.blood_banks (
  bank_id                 uuid primary key default gen_random_uuid(),
  name                    text not null,
  address                 text not null,
  contact_number          text not null,
  city                    text not null,
  latitude                double precision,
  longitude               double precision,
  available_blood_groups  blood_group[] not null default '{}',
  created_by              uuid references public.profiles(user_id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.blood_banks is 'Blood bank directory. available_blood_groups is a manually-curated stock list, editable by admins.';

create index if not exists idx_blood_banks_city on public.blood_banks (city);
create index if not exists idx_blood_banks_groups on public.blood_banks using gin (available_blood_groups);

create table if not exists public.hospitals (
  hospital_id       uuid primary key default gen_random_uuid(),
  name              text not null,
  address           text not null,
  emergency_contact text not null,
  city              text not null,
  latitude          double precision,
  longitude         double precision,
  created_by        uuid references public.profiles(user_id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.hospitals is 'Hospital directory, admin-managed.';

create index if not exists idx_hospitals_city on public.hospitals (city);

drop trigger if exists trg_blood_banks_updated_at on public.blood_banks;
create trigger trg_blood_banks_updated_at
  before update on public.blood_banks
  for each row execute function public.set_updated_at();

drop trigger if exists trg_hospitals_updated_at on public.hospitals;
create trigger trg_hospitals_updated_at
  before update on public.hospitals
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Row Level Security — readable by any signed-in user (donors and
-- recipients both need to browse these), writable only by admins.
-- ------------------------------------------------------------
alter table public.blood_banks enable row level security;
alter table public.hospitals enable row level security;

create policy "blood_banks_select_authenticated"
  on public.blood_banks for select
  to authenticated
  using (true);

create policy "blood_banks_write_admin_only"
  on public.blood_banks for insert
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));

create policy "blood_banks_update_admin_only"
  on public.blood_banks for update
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));

create policy "blood_banks_delete_admin_only"
  on public.blood_banks for delete
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));

create policy "hospitals_select_authenticated"
  on public.hospitals for select
  to authenticated
  using (true);

create policy "hospitals_write_admin_only"
  on public.hospitals for insert
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));

create policy "hospitals_update_admin_only"
  on public.hospitals for update
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));

create policy "hospitals_delete_admin_only"
  on public.hospitals for delete
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));
