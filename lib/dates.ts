// Shared date/status logic — the same rules used across the scheme list
// and scheme detail pages, and in the compliance check.

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

export type ComplianceCheck = { title: string; status: Status; text: string };

// Plain-English status lines shown in the scheme's compliance check.
// Objectives must be reviewed at least every 3 years; the consultant's
// performance against them at least every 12 months.
export function complianceChecks(scheme: Scheme, objectives: Objective[], reviews: Review[], revisions: Revision[]): ComplianceCheck[] {
  if (objectives.length === 0) {
    return [
      {
        title: "Objectives",
        status: "overdue",
        text: "No objectives on file. Set objectives for the investment consultant to be compliant.",
      },
    ];
  }

  function statusFor(due: Date): Status {
    const days = daysUntil(due);
    return days < 0 ? "overdue" : days <= 60 ? "soon" : "ok";
  }

  const checks: ComplianceCheck[] = [];

  const lastRev = lastRevision(revisions);
  const objBase = lastRev ? lastRev.review_date : earliestObjectiveDate(objectives);
  const objDue = revisionDue(scheme, objectives, revisions);
  if (objBase && objDue) {
    const status = statusFor(objDue);
    const what = lastRev ? `Objectives last reviewed on ${fmt(objBase)}` : `Objectives set on ${fmt(objBase)} and not yet reviewed`;
    checks.push({
      title: "Objectives review (every 3 years)",
      status,
      text:
        status === "overdue"
          ? `${what}, more than three years ago. Review the objectives now to be compliant.`
          : `${what}. Next review due by ${fmt(objDue)}.`,
    });
  }

  const lastPerf = lastReview(reviews);
  const perfDue = reviewDue(scheme, reviews);
  if (!perfDue) {
    checks.push({
      title: "Performance review (every 12 months)",
      status: "soon",
      text: "No performance review logged yet. Add the investment consultant's appointment date under Scheme advisers to see when the first one is due.",
    });
  } else {
    const status = statusFor(perfDue);
    const what = lastPerf
      ? `Consultant's performance last reviewed on ${fmt(lastPerf.review_date)}`
      : `No performance review logged since the consultant was appointed on ${fmt(scheme.appointed_date)}`;
    checks.push({
      title: "Performance review (every 12 months)",
      status,
      text:
        status === "overdue"
          ? `${what}, more than 12 months ago. Review performance against the objectives now to be compliant.`
          : `${what}. Next review due by ${fmt(perfDue)}.`,
    });
  }

  return checks;
}
