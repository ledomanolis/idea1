-- =========================================================================
-- The Register — database schema
-- Run this once in your Supabase project's SQL Editor (Project -> SQL Editor
-- -> New query -> paste this whole file -> Run).
-- =========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Profiles: one row per signed-up user, kept in sync with auth.users.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by any signed-in user" on public.profiles for select
  to authenticated
  using (true);

create policy "users manage their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- ---------------------------------------------------------------------
-- Schemes
-- ---------------------------------------------------------------------
create table if not exists public.schemes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider_name text default '',
  provider_address text default '',
  appointed_date date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Scheme members — who can see and edit a scheme.
-- A row can exist before someone has signed up yet (invited_email set,
-- user_id null); it gets linked automatically the first time that
-- person signs in (see handle_new_user() below).
-- ---------------------------------------------------------------------
create table if not exists public.scheme_members (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  invited_email text not null,
  user_id uuid references auth.users(id),
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  unique (scheme_id, invited_email)
);

-- ---------------------------------------------------------------------
-- Objectives, reviews, objective revisions
-- ---------------------------------------------------------------------
create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  category text not null check (category in ('investments', 'sip', 'saa', 'manager')),
  body text not null,
  date_set date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  review_date date not null default current_date,
  services_reviewed boolean not null default false,
  notes text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.revisions (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  review_date date not null default current_date,
  changed boolean not null default false,
  notes text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Membership helper (security definer so it can be used inside RLS
-- policies on scheme_members itself without recursive-policy errors).
-- ---------------------------------------------------------------------
create or replace function public.is_scheme_member(p_scheme_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.scheme_members
    where scheme_id = p_scheme_id
      and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- New-user hook: create a profile row, and link any pending invites
-- that were sent to this email address before they signed up.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  update public.scheme_members
  set user_id = new.id
  where user_id is null
    and lower(invited_email) = lower(new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-add the creator of a scheme as its owner.
create or replace function public.handle_new_scheme()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.scheme_members (scheme_id, invited_email, user_id, role)
  select new.id, p.email, new.created_by, 'owner'
  from public.profiles p where p.id = new.created_by
  on conflict (scheme_id, invited_email) do nothing;

  return new;
end;
$$;

drop trigger if exists on_scheme_created on public.schemes;
create trigger on_scheme_created
  after insert on public.schemes
  for each row execute function public.handle_new_scheme();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.schemes enable row level security;
alter table public.scheme_members enable row level security;
alter table public.objectives enable row level security;
alter table public.reviews enable row level security;
alter table public.revisions enable row level security;

-- schemes: members can read/update/delete; any signed-in user can create one
create policy "members read their schemes"
  on public.schemes for select to authenticated
  using (public.is_scheme_member(id));

create policy "signed-in users create schemes"
  on public.schemes for insert to authenticated
  with check (created_by = auth.uid());

create policy "members update their schemes"
  on public.schemes for update to authenticated
  using (public.is_scheme_member(id));

create policy "owners delete their schemes"
  on public.schemes for delete to authenticated
  using (exists (
    select 1 from public.scheme_members
    where scheme_id = id and user_id = auth.uid() and role = 'owner'
  ));

-- scheme_members: members can see who else is on the scheme; any member
-- can invite (insert) a new member; a member can remove themselves or
-- (if owner) anyone.
create policy "members read scheme membership"
  on public.scheme_members for select to authenticated
  using (public.is_scheme_member(scheme_id));

create policy "members invite new members"
  on public.scheme_members for insert to authenticated
  with check (public.is_scheme_member(scheme_id));

create policy "members remove membership"
  on public.scheme_members for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.scheme_members m
      where m.scheme_id = scheme_members.scheme_id
        and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

-- objectives / reviews / revisions: full access for scheme members
create policy "members read objectives" on public.objectives for select to authenticated using (public.is_scheme_member(scheme_id));
create policy "members write objectives" on public.objectives for insert to authenticated with check (public.is_scheme_member(scheme_id));
create policy "members delete objectives" on public.objectives for delete to authenticated using (public.is_scheme_member(scheme_id));

create policy "members read reviews" on public.reviews for select to authenticated using (public.is_scheme_member(scheme_id));
create policy "members write reviews" on public.reviews for insert to authenticated with check (public.is_scheme_member(scheme_id));
create policy "members delete reviews" on public.reviews for delete to authenticated using (public.is_scheme_member(scheme_id));

create policy "members read revisions" on public.revisions for select to authenticated using (public.is_scheme_member(scheme_id));
create policy "members write revisions" on public.revisions for insert to authenticated with check (public.is_scheme_member(scheme_id));
create policy "members delete revisions" on public.revisions for delete to authenticated using (public.is_scheme_member(scheme_id));
