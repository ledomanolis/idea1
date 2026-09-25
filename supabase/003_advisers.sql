-- =========================================================================
-- The Register — scheme advisers. Run this once in Supabase's SQL Editor,
-- after 002_documents.sql.
--
-- The investment consultant keeps using the existing provider_name and
-- appointed_date columns; this adds the administrator and the actuary,
-- plus key contacts for each adviser.
-- =========================================================================

alter table public.schemes
  add column if not exists admin_name text default '',
  add column if not exists admin_appointed_date date,
  add column if not exists actuary_name text default '',
  add column if not exists actuary_appointed_date date;

create table if not exists public.adviser_contacts (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  adviser text not null check (adviser in ('admin', 'investment', 'actuary')),
  name text not null,
  role text default '',
  email text default '',
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.adviser_contacts enable row level security;

create policy "members read adviser contacts" on public.adviser_contacts for select to authenticated using (public.is_scheme_member(scheme_id));
create policy "members write adviser contacts" on public.adviser_contacts for insert to authenticated with check (public.is_scheme_member(scheme_id));
create policy "members delete adviser contacts" on public.adviser_contacts for delete to authenticated using (public.is_scheme_member(scheme_id));
