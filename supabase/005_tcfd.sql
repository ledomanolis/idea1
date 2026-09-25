-- =========================================================================
-- The Register — TCFD opt-out. Run this once in Supabase's SQL Editor,
-- after 004_publication.sql.
--
-- Smaller schemes don't have to produce a TCFD report; untick the box on
-- the scheme page to hide the TCFD section and its reminder.
-- =========================================================================

alter table public.schemes add column if not exists tcfd_required boolean not null default true;
