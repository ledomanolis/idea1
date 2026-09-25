// Every reminder for a scheme in one list, so the overview, the left-hand
// rail and the scheme page all agree. `tab` and `anchor` say where on the
// scheme page each reminder belongs.

import { complianceChecks, type ComplianceCheck, type Status } from "@/lib/dates";
import { publicationChecks } from "@/lib/documents";

export type SchemeCheck = ComplianceCheck & { tab: string; anchor: string };

export function schemeChecks(
  scheme: any,
  objectives: any[],
  reviews: any[],
  revisions: any[],
  documents: any[]
): SchemeCheck[] {
  return [
    ...complianceChecks(scheme, objectives, reviews, revisions).map((c) => ({
      ...c,
      tab: "objectives",
      anchor: "compliance-check",
    })),
    ...publicationChecks(documents, scheme.tcfd_required !== false).map((c) => ({
      ...c,
      tab: "reports",
      anchor: "annual-reports",
    })),
  ];
}

export function checkHref(schemeId: string, check: SchemeCheck): string {
  return `/schemes/${schemeId}?tab=${check.tab}#${check.anchor}`;
}

export function worstStatus(checks: { status: Status }[]): Status {
  if (checks.some((c) => c.status === "overdue")) return "overdue";
  if (checks.some((c) => c.status === "soon")) return "soon";
  return "ok";
}
