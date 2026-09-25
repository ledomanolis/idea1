// Annual report document types shown on each scheme, and the storage
// bucket their files live in (see supabase/002_documents.sql).

export const DOCUMENTS_BUCKET = "scheme-documents";

export const DOC_TYPES: { id: string; label: string; note: string }[] = [
  { id: "tcfd", label: "TCFD report", note: "Climate-related financial disclosures." },
  { id: "sip", label: "Statement of Investment Principles", note: "The current SIP and earlier versions." },
  { id: "trustee_report", label: "Trustee Report and Accounts", note: "The annual report and audited accounts." },
];

export function fileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
