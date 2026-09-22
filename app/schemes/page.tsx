import Rail from "@/components/Rail";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { schemeStatus, reviewDue, revisionDue, fmt } from "@/lib/dates";

export default async function SchemesOverviewPage() {
  const supabase = createClient();

  const { data: schemes } = await supabase
    .from("schemes")
    .select("id, name, provider_name, provider_address, appointed_date")
    .order("name", { ascending: true });

  const ids = (schemes || []).map((s) => s.id);

  const [{ data: objectives }, { data: reviews }, { data: revisions }] = ids.length
    ? await Promise.all([
        supabase.from("objectives").select("scheme_id, category, body, date_set").in("scheme_id", ids),
        supabase.from("reviews").select("scheme_id, review_date, services_reviewed, notes").in("scheme_id", ids),
        supabase.from("revisions").select("scheme_id, review_date, changed, notes").in("scheme_id", ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const groups: Record<string, any[]> = { overdue: [], soon: [], ok: [] };

  (schemes || []).forEach((s) => {
    const objs = (objectives || []).filter((o) => o.scheme_id === s.id) as any;
    const revs = (reviews || []).filter((r) => r.scheme_id === s.id) as any;
    const revis = (revisions || []).filter((r) => r.scheme_id === s.id) as any;
    const st = schemeStatus(s as any, objs, revs, revis);
    groups[st].push({ ...s, objs, revs, revis });
  });

  function Group({ title, note, items }: { title: string; note: string; items: any[] }) {
    return (
      <section className="block">
        <h3>{title}</h3>
        <p className="block-note">{note}</p>
        <hr className="rule" />
        {items.length === 0 ? (
          <div className="empty-state">Nothing here.</div>
        ) : (
          items.map((s) => {
            const rd = reviewDue(s, s.revs);
            const vd = revisionDue(s, s.objs, s.revis);
            const bits: string[] = [];
            if (s.objs.length === 0) bits.push("No objectives have been set yet.");
            else {
              if (rd) bits.push("Annual review due " + fmt(rd));
              if (vd) bits.push("Objectives revision due " + fmt(vd));
            }
            return (
              <Link
                key={s.id}
                href={`/schemes/${s.id}`}
                className="obj-card"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b>{s.name}</b>
                  <span className="cat-tag">{s.provider_name || "—"}</span>
                </div>
                <p className="obj-text">{bits.join(" · ")}</p>
              </Link>
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
                For each scheme, the register tracks the objectives you&apos;ve set for your
                investment consultant, when they were last reviewed, and when they&apos;re next
                due.
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
                note="Objectives not yet set, or a review/revision is overdue."
                items={groups.overdue}
              />
              <Group
                title="Due soon"
                note="A review or revision falls due within 60 days."
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
