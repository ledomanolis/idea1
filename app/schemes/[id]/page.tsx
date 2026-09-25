import Rail from "@/components/Rail";
import CopyButton from "@/components/CopyButton";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  CATEGORIES,
  fmt,
  reviewDue,
  revisionDue,
  buildStatement,
  daysUntil,
} from "@/lib/dates";
import {
  updateDetails,
  addObjective,
  deleteObjective,
  addReview,
  addRevision,
  inviteMember,
  removeMember,
  deleteScheme,
} from "./actions";

export default async function SchemeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const schemeId = params.id;

  const { data: scheme } = await supabase.from("schemes").select("*").eq("id", schemeId).maybeSingle();
  if (!scheme) notFound();

  const [{ data: objectives }, { data: reviews }, { data: revisions }, { data: members }, { data: allSchemes }] =
    await Promise.all([
      supabase.from("objectives").select("*").eq("scheme_id", schemeId),
      supabase.from("reviews").select("*").eq("scheme_id", schemeId),
      supabase.from("revisions").select("*").eq("scheme_id", schemeId),
      supabase.from("scheme_members").select("*").eq("scheme_id", schemeId),
      supabase.from("schemes").select("id").order("name", { ascending: true }),
    ]);

  const objs = (objectives || []) as any[];
  const revs = (reviews || []) as any[];
  const revis = (revisions || []) as any[];

  const fileIndex = (allSchemes || []).findIndex((s) => s.id === schemeId) + 1;

  const rd = reviewDue(scheme as any, revs);
  const vd = revisionDue(scheme as any, objs, revis);

  function chip(label: string, when: Date | null, key?: string) {
    let cls = "ok";
    if (when) {
      const days = daysUntil(when);
      cls = days < 0 ? "overdue" : days <= 60 ? "soon" : "ok";
    }
    return (
      <span className={`status-chip ${cls}`} key={key || label}>
        <span className="dot2" /> {label}
      </span>
    );
  }

  const sortedObjs = [...objs].sort((a, b) => (a.date_set < b.date_set ? 1 : -1));
  const sortedRevs = [...revs].sort((a, b) => (a.review_date < b.review_date ? 1 : -1));
  const sortedRevis = [...revis].sort((a, b) => (a.review_date < b.review_date ? 1 : -1));

  return (
    <div className="shell">
      <Rail activeId={schemeId} />
      <main className="content">
        <div className="doc">
          <div className="doc-head">
            <p className="file-no">Entry No. {String(fileIndex).padStart(3, "0")}</p>
            <h2>{scheme.name}</h2>
            <p className="provider-line">
              Consultant: <b>{scheme.provider_name || "not set"}</b>
              {scheme.appointed_date ? ` · appointed ${fmt(scheme.appointed_date)}` : ""}
            </p>
            <div className="status-row">
              {objs.length === 0
                ? chip("No objectives set", null, "none")
                : [
                    chip(`Annual review: ${rd ? fmt(rd) : "—"}`, rd, "review"),
                    chip(`Revision review: ${vd ? fmt(vd) : "—"}`, vd, "revision"),
                  ]}
            </div>
          </div>

          {/* Details */}
          <section className="block">
            <h3>Scheme &amp; consultant details</h3>
            <p className="block-note">These appear on the compliance statement.</p>
            <hr className="rule" />
            <form action={updateDetails}>
              <input type="hidden" name="scheme_id" value={schemeId} />
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="name">Scheme name</label>
                  <input id="name" name="name" defaultValue={scheme.name} />
                </div>
                <div className="field">
                  <label htmlFor="appointed_date">Consultant appointed on</label>
                  <input
                    id="appointed_date"
                    name="appointed_date"
                    type="date"
                    defaultValue={scheme.appointed_date || ""}
                  />
                </div>
                <div className="field">
                  <label htmlFor="provider_name">Investment consultant / firm name</label>
                  <input id="provider_name" name="provider_name" defaultValue={scheme.provider_name || ""} />
                </div>
                <div className="field">
                  <label htmlFor="provider_address">Consultant&apos;s registered address</label>
                  <input
                    id="provider_address"
                    name="provider_address"
                    defaultValue={scheme.provider_address || ""}
                  />
                </div>
              </div>
              <button className="btn" type="submit">
                Save details
              </button>
            </form>
          </section>

          {/* Objectives */}
          <section className="block">
            <h3>Objectives on file</h3>
            <p className="block-note">
              You need objectives covering the areas below before you contract, or continue,
              with an investment consultant.
            </p>
            <hr className="rule" />
            {sortedObjs.length === 0 ? (
              <div className="empty-state">No objectives recorded yet — this scheme is currently non-compliant.</div>
            ) : (
              sortedObjs.map((o) => {
                const catLabel = CATEGORIES.find((c) => c.id === o.category)?.label || o.category;
                return (
                  <div className="obj-card" key={o.id}>
                    <span className="cat-tag">{catLabel}</span>
                    <p className="obj-text">{o.body}</p>
                    <span className="obj-date">Set {fmt(o.date_set)}</span>
                    <form action={deleteObjective} style={{ display: "inline" }}>
                      <input type="hidden" name="scheme_id" value={schemeId} />
                      <input type="hidden" name="objective_id" value={o.id} />
                      <button className="btn danger small" type="submit" style={{ marginLeft: 10 }}>
                        Remove
                      </button>
                    </form>
                  </div>
                );
              })
            )}
            <details style={{ marginTop: 12 }}>
              <summary className="btn" style={{ display: "inline-block", listStyle: "none", cursor: "pointer" }}>
                + Add an objective
              </summary>
              <form action={addObjective} style={{ marginTop: 14 }}>
                <input type="hidden" name="scheme_id" value={schemeId} />
                <div className="field">
                  <label htmlFor="category">Category</label>
                  <select id="category" name="category">
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="body">Objective</label>
                  <textarea id="body" name="body" required />
                </div>
                <div className="field">
                  <label htmlFor="date_set">Date set</label>
                  <input id="date_set" name="date_set" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <button className="btn primary" type="submit">
                  Add objective
                </button>
              </form>
            </details>
          </section>

          {/* Annual reviews */}
          <section className="block">
            <h3>Annual performance reviews</h3>
            <p className="block-note">Review the consultant&apos;s performance against the objectives at least once a year.</p>
            <hr className="rule" />
            {sortedRevs.length === 0 ? (
              <div className="empty-state">No review logged yet.</div>
            ) : (
              sortedRevs.map((r) => (
                <div className="log-entry" key={r.id}>
                  <span className="log-date">{fmt(r.review_date)}</span>
                  <span>
                    <span className="flags">
                      <span className="flag">Objectives reviewed</span>
                      <span className={"flag" + (r.services_reviewed ? "" : " off")}>Services reviewed</span>
                    </span>
                    {r.notes && <span className="notes">{r.notes}</span>}
                  </span>
                </div>
              ))
            )}
            <details style={{ marginTop: 12 }}>
              <summary className="btn" style={{ display: "inline-block", listStyle: "none", cursor: "pointer" }}>
                + Log a review
              </summary>
              <form action={addReview} style={{ marginTop: 14 }}>
                <input type="hidden" name="scheme_id" value={schemeId} />
                <div className="field">
                  <label htmlFor="review_date">Review date</label>
                  <input id="review_date" name="review_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input id="services_reviewed" name="services_reviewed" type="checkbox" style={{ width: "auto" }} />
                  <label htmlFor="services_reviewed" style={{ margin: 0 }}>
                    Consultant&apos;s services (not just objectives) were also reviewed
                  </label>
                </div>
                <div className="field">
                  <label htmlFor="notes">Notes / outcome</label>
                  <textarea id="notes" name="notes" />
                </div>
                <button className="btn primary" type="submit">
                  Save review
                </button>
              </form>
            </details>
          </section>

          {/* Revisions */}
          <section className="block">
            <h3>Objective revisions</h3>
            <p className="block-note">
              Review, and revise if needed, the objectives themselves at least every 3 years or after a significant
              change in investment strategy.
            </p>
            <hr className="rule" />
            {sortedRevis.length === 0 ? (
              <div className="empty-state">No revision logged yet.</div>
            ) : (
              sortedRevis.map((r) => (
                <div className="log-entry" key={r.id}>
                  <span className="log-date">{fmt(r.review_date)}</span>
                  <span>
                    <span className="flags">
                      <span className="flag">{r.changed ? "Objectives revised" : "Reviewed, no change"}</span>
                    </span>
                    {r.notes && <span className="notes">{r.notes}</span>}
                  </span>
                </div>
              ))
            )}
            <details style={{ marginTop: 12 }}>
              <summary className="btn" style={{ display: "inline-block", listStyle: "none", cursor: "pointer" }}>
                + Log a revision review
              </summary>
              <form action={addRevision} style={{ marginTop: 14 }}>
                <input type="hidden" name="scheme_id" value={schemeId} />
                <div className="field">
                  <label htmlFor="rv_date">Review date</label>
                  <input id="rv_date" name="review_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input id="changed" name="changed" type="checkbox" style={{ width: "auto" }} />
                  <label htmlFor="changed" style={{ margin: 0 }}>
                    Objectives were changed as a result
                  </label>
                </div>
                <div className="field">
                  <label htmlFor="rv_notes">Notes</label>
                  <textarea id="rv_notes" name="notes" />
                </div>
                <button className="btn primary" type="submit">
                  Save
                </button>
              </form>
            </details>
          </section>

          {/* Compliance statement */}
          <section className="block">
            <h3>Compliance statement</h3>
            <p className="block-note">Drafted from the entries above, in the form your annual statement can be built from.</p>
            <hr className="rule" />
            <div className="statement-box">{buildStatement(scheme as any, objs, revs, revis)}</div>
            <div className="btn-row">
              <CopyButton text={buildStatement(scheme as any, objs, revs, revis)} />
            </div>
          </section>

          {/* Members */}
          <section className="block">
            <h3>Who has access</h3>
            <p className="block-note">
              Anyone added here — at the client or at the adviser — can sign in with their own email and edit this scheme.
            </p>
            <hr className="rule" />
            {(members || []).map((m: any) => (
              <div className="member-row" key={m.id}>
                <span>
                  {m.invited_email} {!m.user_id && <span className="badge">invited, not yet signed in</span>}
                  {m.role === "owner" && <span className="badge">owner</span>}
                </span>
                <form action={removeMember}>
                  <input type="hidden" name="scheme_id" value={schemeId} />
                  <input type="hidden" name="member_id" value={m.id} />
                  <button className="btn danger small" type="submit">
                    Remove
                  </button>
                </form>
              </div>
            ))}
            <form action={inviteMember} style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input type="hidden" name="scheme_id" value={schemeId} />
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label htmlFor="invite_email">Add someone by email</label>
                <input id="invite_email" name="email" type="email" required placeholder="name@example.com" />
              </div>
              <button className="btn primary" type="submit">
                Add
              </button>
            </form>
          </section>

          {/* Danger zone */}
          <section className="block">
            <form action={deleteScheme}>
              <input type="hidden" name="scheme_id" value={schemeId} />
              <button className="btn danger" type="submit">
                Remove this scheme from the register
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
