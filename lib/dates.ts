// Shared date/status logic — the same rules used across the scheme list
// and scheme detail pages, and in the compliance summary text.

export const CATEGORIES: { id: string; label: string }[] = [
  { id: "investments", label: "Investments held or made on the trustees' behalf" },
  { id: "sip", label: "Matters trustees must by law seek advice on for the SIP" },
  { id: "saa", label: "Strategic asset allocation" },
  { id: "manager", label: "Manager selection" },
];

export function fmt(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function addMonths(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + n);
  return d;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(d: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

export type Objective = { id: string; category: string; body: string; date_set: string };
export type Review = { id: string; review_date: string; services_reviewed: boolean; notes: string };
export type Revision = { id: string; review_date: string; changed: boolean; notes: string };
export type Scheme = {
  id: string;
  name: string;
  provider_name: string | null;
  provider_address: string | null;
  appointed_date: string | null;
};

export function lastReview(reviews: Review[]): Review | null {
  const sorted = [...reviews].sort((a, b) => (a.review_date < b.review_date ? 1 : -1));
  return sorted[0] || null;
}

export function lastRevision(revisions: Revision[]): Revision | null {
  const sorted = [...revisions].sort((a, b) => (a.review_date < b.review_date ? 1 : -1));
  return sorted[0] || null;
}

export function earliestObjectiveDate(objectives: Objective[]): string | null {
  const dates = objectives.map((o) => o.date_set).filter(Boolean).sort();
  return dates.length ? dates[0] : null;
}

export function reviewDue(scheme: Scheme, reviews: Review[]): Date | null {
  const last = lastReview(reviews);
  const baseStr = last ? last.review_date : scheme.appointed_date;
  if (!baseStr) return null;
  return addMonths(new Date(baseStr + "T00:00:00"), 12);
}

export function revisionDue(scheme: Scheme, objectives: Objective[], revisions: Revision[]): Date | null {
  const last = lastRevision(revisions);
  const baseStr = last ? last.review_date : earliestObjectiveDate(objectives);
  if (!baseStr) return null;
  return addMonths(new Date(baseStr + "T00:00:00"), 36);
}

export type Status = "overdue" | "soon" | "ok";

export function schemeStatus(
  scheme: Scheme,
  objectives: Objective[],
  reviews: Review[],
  revisions: Revision[]
): Status {
  if (objectives.length === 0) return "overdue";

  const flags: Status[] = [];
  [reviewDue(scheme, reviews), revisionDue(scheme, objectives, revisions)].forEach((d) => {
    if (!d) return;
    const days = daysUntil(d);
    if (days < 0) flags.push("overdue");
    else if (days <= 60) flags.push("soon");
    else flags.push("ok");
  });

  if (flags.includes("overdue")) return "overdue";
  if (flags.includes("soon")) return "soon";
  return "ok";
}

export function buildStatement(
  scheme: Scheme,
  objectives: Objective[],
  reviews: Review[],
  revisions: Revision[]
): string {
  const haveObjectives = objectives.length > 0;
  const earliest = earliestObjectiveDate(objectives);
  const lastRev = lastRevision(revisions);
  const lastRev2 = lastReview(reviews);
  const due = reviewDue(scheme, reviews);
  const covered = CATEGORIES.filter((c) => objectives.some((o) => o.category === c.id)).map(
    (c) => c.label
  );

  const lines: string[] = [];
  lines.push(`${scheme.name || "This scheme"} — investment consultant compliance summary`);
  lines.push(`Prepared ${fmt(todayISO())}`);
  lines.push("");
  lines.push(
    `Consultant: ${scheme.provider_name || "not recorded"}${
      scheme.provider_address ? ", " + scheme.provider_address : ""
    }`
  );
  lines.push(`Appointed: ${scheme.appointed_date ? fmt(scheme.appointed_date) : "not recorded"}`);
  lines.push("");
  lines.push(`Objectives set: ${haveObjectives ? "Yes" : "No"}`);
  if (haveObjectives) {
    lines.push(
      `  First set on ${fmt(earliest)}${
        lastRev ? "; last revised " + fmt(lastRev.review_date) : ""
      }.`
    );
    lines.push(`  Areas covered: ${covered.length ? covered.join("; ") : "none recorded"}.`);
  } else {
    lines.push("  No objectives are currently on file for this consultant.");
  }
  lines.push("");
  lines.push(`Performance reviewed against objectives: ${lastRev2 ? "Yes" : "No"}`);
  if (lastRev2) {
    lines.push(
      `  Last reviewed ${fmt(lastRev2.review_date)}${
        lastRev2.notes ? " — " + lastRev2.notes : ""
      }.`
    );
    lines.push(`  Next review due ${due ? fmt(due) : "—"}.`);
  } else {
    lines.push("  No review has been logged yet.");
  }
  lines.push("");
  lines.push(
    `Services reviewed: ${
      lastRev2 && lastRev2.services_reviewed
        ? "Yes, as part of the most recent review."
        : "Not recorded as part of the most recent review."
    }`
  );

  return lines.join("\n");
}
