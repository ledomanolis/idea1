// Annual report document types shown on each scheme, and the storage
// bucket their files live in (see supabase/002_documents.sql).

import { addMonths, daysUntil, fmt, type ComplianceCheck } from "@/lib/dates";

export const DOCUMENTS_BUCKET = "scheme-documents";

// `annual` types must be published every year; they get a reminder line.
export const DOC_TYPES: { id: string; label: string; note: string; annual: boolean }[] = [
  { id: "tcfd", label: "TCFD report", note: "Climate-related financial disclosures.", annual: false },
  { id: "sip", label: "Statement of Investment Principles", note: "The current SIP and earlier versions.", annual: true },
  { id: "trustee_report", label: "Trustee Report and Accounts", note: "The annual report and audited accounts.", annual: true },
  {
    id: "implementation_statement",
    label: "Implementation statement",
    note: "How the SIP has been followed over the scheme year.",
    annual: true,
  },
];

export function fileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// One reminder line per annual document type, based on the most recent
// version uploaded with a publication date.
export function publicationChecks(docs: { doc_type: string; published_on: string | null }[]): ComplianceCheck[] {
  return DOC_TYPES.filter((t) => t.annual).map((t): ComplianceCheck => {
    const dates = docs
      .filter((d) => d.doc_type === t.id && d.published_on)
      .map((d) => d.published_on as string)
      .sort();
    const last = dates[dates.length - 1];
    if (!last) {
      return {
        title: `${t.label} (published annually)`,
        status: "soon",
        text: "No published version recorded yet. Upload the published version with its publication date.",
      };
    }
    const due = addMonths(new Date(last + "T00:00:00"), 12);
    const days = daysUntil(due);
    const status = days < 0 ? "overdue" : days <= 60 ? "soon" : "ok";
    return {
      title: `${t.label} (published annually)`,
      status,
      text:
        status === "overdue"
          ? `Last published on ${fmt(last)}, more than 12 months ago. Publish an updated version to be compliant.`
          : `Last published on ${fmt(last)}. Next due by ${fmt(due)}.`,
    };
  });
}
