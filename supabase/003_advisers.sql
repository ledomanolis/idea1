-- =========================================================================
-- The Register — scheme advisers. Run this once in Supabase's SQL Editor,
-- after 002_documents.sql.
--
-- The investment consultant keeps using the existing provider_name and
-- appointed_date columns; this adds the administrator and the actuary.
-- =========================================================================

alter table public.schemes
  add column if not exists admin_name text default '',
  add column if not exists admin_appointed_date date,
  add column if not exists actuary_name text default '',
  add column if not exists actuary_appointed_date date;
