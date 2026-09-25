-- =========================================================================
-- The Register — annual report documents (TCFD, SIP, Trustee Report and
-- Accounts). Run this once in Supabase's SQL Editor, after schema.sql.
-- =========================================================================

-- ---------------------------------------------------------------------
-- One row per uploaded file. Uploading a new version adds a new row, so
-- earlier versions stay available.
-- ---------------------------------------------------------------------
create table if not exists public.scheme_documents (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  doc_type text not null check (doc_type in ('tcfd', 'sip', 'trustee_report')),
  report_year int,
  file_name text not null,
  storage_path text not null unique,
  size_bytes bigint,
  notes text default '',
  uploaded_by uuid references auth.users(id) default auth.uid(),
  uploaded_by_email text,
  created_at timestamptz not null default now()
);

alter table public.scheme_documents enable row level security;

create policy "members read documents" on public.scheme_documents for select to authenticated using (public.is_scheme_member(scheme_id));
create policy "members write documents" on public.scheme_documents for insert to authenticated with check (public.is_scheme_member(scheme_id));
create policy "members delete documents" on public.scheme_documents for delete to authenticated using (public.is_scheme_member(scheme_id));

-- ---------------------------------------------------------------------
-- Private storage bucket for the files themselves (50 MB per file).
-- Files are stored as <scheme_id>/<doc_type>/<random>-<file name>, so the
-- first folder decides which scheme's members can reach them.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('scheme-documents', 'scheme-documents', false, 52428800)
on conflict (id) do nothing;

create policy "members read scheme files" on storage.objects for select to authenticated
  using (bucket_id = 'scheme-documents' and public.is_scheme_member(((storage.foldername(name))[1])::uuid));

create policy "members upload scheme files" on storage.objects for insert to authenticated
  with check (bucket_id = 'scheme-documents' and public.is_scheme_member(((storage.foldername(name))[1])::uuid));

create policy "members delete scheme files" on storage.objects for delete to authenticated
  using (bucket_id = 'scheme-documents' and public.is_scheme_member(((storage.foldername(name))[1])::uuid));
