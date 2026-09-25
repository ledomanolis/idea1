-- =========================================================================
-- The Register — implementation statements and publication dates. Run this
-- once in Supabase's SQL Editor, after 003_advisers.sql.
-- =========================================================================

-- Allow implementation statements as a document type.
alter table public.scheme_documents drop constraint if exists scheme_documents_doc_type_check;
alter table public.scheme_documents add constraint scheme_documents_doc_type_check
  check (doc_type in ('tcfd', 'sip', 'trustee_report', 'implementation_statement'));

-- When a version was published. Left empty for drafts; the annual
-- publication reminders only count versions with this date.
alter table public.scheme_documents add column if not exists published_on date;
