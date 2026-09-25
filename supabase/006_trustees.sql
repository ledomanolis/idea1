-- =========================================================================
-- The Register — trustees. Run this once in Supabase's SQL Editor, after
-- 005_tcfd.sql.
-- =========================================================================

create table if not exists public.scheme_trustees (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  name text not null,
  role text default '',
  email text default '',
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.scheme_trustees enable row level security;

create policy "members read trustees" on public.scheme_trustees for select to authenticated using (public.is_scheme_member(scheme_id));
create policy "members write trustees" on public.scheme_trustees for insert to authenticated with check (public.is_scheme_member(scheme_id));
create policy "members delete trustees" on public.scheme_trustees for delete to authenticated using (public.is_scheme_member(scheme_id));
