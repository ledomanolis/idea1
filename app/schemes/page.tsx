import Rail from "@/components/Rail";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { schemeChecks, worstStatus, type SchemeCheck } from "@/lib/status";
import type { Status } from "@/lib/dates";

export default async function SchemesOverviewPage() {
  const supabase = createClient();

  const { data: schemes } = await supabase.from("schemes").select("*").order("name", { ascending: true });

  const ids = (schemes || []).map((s) => s.id);

  const [{ data: objectives }, { data: reviews }, { data: revisions }, { data: documents }] = ids.length
    ? await Promise.all([
        supabase.from("objectives").select("scheme_id, category, body, date_set").in("scheme_id", ids),
        supabase.from("reviews").select("scheme_id, review_date, services_reviewed, notes").in("scheme_id", ids),
        supabase.from("revisions").select("scheme_id, review_date, changed, notes").in("scheme_id", ids),
        supabase.from("scheme_documents").select("scheme_id, doc_type, published_on").in("scheme_id", ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const groups: Record<string, { id: string; name: string; checks: SchemeCheck[] }[]> = {
    overdue: [],
    soon: [],
    ok: [],
  };

  (schemes || []).forEach((s) => {
    const checks = schemeChecks(
      s,
      (objectives || []).filter((o) => o.scheme_id === s.id),
      (reviews || []).filter((r) => r.scheme_id === s.id),
      (revisions || []).filter((r) => r.scheme_id === s.id),
      (documents || []).filter((d) => d.scheme_id === s.id)
    );
    groups[worstStatus(checks)].push({ id: s.id, name: s.name, checks });
  });

  function Group({
    title,
    note,
    items,
  }: {
    title: string;
    note: string;
    items: { id: string; name: string; checks: SchemeCheck[] }[];
  }) {
    return (
      <section className="block">
        <h3>{title}</h3>
        <p className="block-note">{note}</p>
        <hr className="rule" />
        {items.length === 0 ? (
          <div className="empty-state">Nothing here.</div>
        ) : (
          items.map((s) => {
            // Order the reminders worst first; on-track schemes list everything.
            const rank: Record<Status, number> = { overdue: 0, soon: 1, ok: 2 };
            const shown = [...s.checks]
              .filter((c) => c.status !== "ok" || items === groups.ok)
              .sort((a, b) => rank[a.status] - rank[b.status]);
            return (
              <div className="obj-card" key={s.id}>
                <Link href={`/schemes/${s.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                  <b>{s.name}</b>
                </Link>
                <div style={{ marginTop: 8 }}>
                  {shown.map((c) => (
                    <Link href={`/schemes/${s.id}#${c.anchor}`} className="check-link" key={c.title}>
                      <span className={`dot ${c.status}`} />
                      <span>
                        <span className="check-link-title">{c.title}:</span> {c.text}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>
    );
  }

  return (
    <div className="shell">
      <Rail />
      <main className="content">
        <div className="doc">
          {(schemes || []).length === 0 ? (
            <>
              <div className="doc-head">
                <h2>Set up your first entry</h2>
              </div>
              <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.6 }}>
                For each scheme, the register keeps its advisers, the objectives set for the
                investment consultant and its annual reports in one place, and reminds you when
                each is next due.
              </p>
              <div className="btn-row">
                <Link href="/schemes/new" className="btn primary" style={{ textDecoration: "none" }}>
                  Add a scheme
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="doc-head">
                <p className="file-no">Register overview</p>
                <h2>Every scheme, at a glance</h2>
                <p className="provider-line">{(schemes || []).length} scheme(s) on file</p>
              </div>
              <Group
                title="Action needed"
                note="Immediate action required. Click a reminder to go straight to it."
                items={groups.overdue}
              />
              <Group
                title="Due soon"
                note="Something falls due within 60 days or hasn't been recorded yet."
                items={groups.soon}
              />
              <Group title="On track" note="Nothing due in the near term." items={groups.ok} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
