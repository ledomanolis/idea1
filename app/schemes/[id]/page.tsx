import Rail from "@/components/Rail";
import DocumentUpload from "@/components/DocumentUpload";
import { createClient } from "@/lib/supabase/server";
import { docTypesFor, fileSize, publicationChecks } from "@/lib/documents";
import { ADVISERS } from "@/lib/advisers";
import { notFound } from "next/navigation";
import { CATEGORIES, fmt, complianceChecks } from "@/lib/dates";
import {
  updateDetails,
  updateAdviser,
  addAdviserContact,
  removeAdviserContact,
  addObjective,
  deleteObjective,
  addReview,
  addRevision,
  inviteMember,
  removeMember,
  deleteScheme,
  deleteDocument,
} from "./actions";

export default async function SchemeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const schemeId = params.id;

  const { data: scheme } = await supabase.from("schemes").select("*").eq("id", schemeId).maybeSingle();
  if (!scheme) notFound();

  const [
    { data: objectives },
    { data: reviews },
    { data: revisions },
    { data: members },
    { data: documents },
    { data: contacts },
  ] = await Promise.all([
    supabase.from("objectives").select("*").eq("scheme_id", schemeId),
    supabase.from("reviews").select("*").eq("scheme_id", schemeId),
    supabase.from("revisions").select("*").eq("scheme_id", schemeId),
    supabase.from("scheme_members").select("*").eq("scheme_id", schemeId),
    supabase
      .from("scheme_documents")
      .select("*")
      .eq("scheme_id", schemeId)
      .order("report_year", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("adviser_contacts").select("*").eq("scheme_id", schemeId).order("created_at", { ascending: true }),
  ]);

  const docs = (documents || []) as any[];
  const contactList = (contacts || []) as any[];
  const tcfdRequired = scheme.tcfd_required !== false;
  const objs = (objectives || []) as any[];
  const revs = (reviews || []) as any[];
  const revis = (revisions || []) as any[];

  const sortedObjs = [...objs].sort((a, b) => (a.date_set < b.date_set ? 1 : -1));
  const sortedRevs = [...revs].sort((a, b) => (a.review_date < b.review_date ? 1 : -1));
  const sortedRevis = [...revis].sort((a, b) => (a.review_date < b.review_date ? 1 : -1));

  return (
    <div className="shell">
      <Rail activeId={schemeId} />
      <main className="content">
        <div className="doc">
          <div className="doc-head">
            <h2>{scheme.name}</h2>
          </div>

          {/* Details */}
          <section className="block">
            <h3>Scheme details</h3>
            <hr className="rule" />
            <form action={updateDetails}>
              <input type="hidden" name="scheme_id" value={schemeId} />
              <div className="field">
                <label htmlFor="name">Scheme name</label>
                <input id="name" name="name" defaultValue={scheme.name} />
              </div>
              <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  id="tcfd_required"
                  name="tcfd_required"
                  type="checkbox"
                  defaultChecked={scheme.tcfd_required !== false}
                  style={{ width: "auto" }}
                />
                <label htmlFor="tcfd_required" style={{ margin: 0 }}>
                  This scheme must produce a TCFD report (untick if it&apos;s too small to be in scope)
                </label>
              </div>
              <button className="btn" type="submit">
                Save details
              </button>
            </form>
          </section>

          {/* Advisers */}
          <section className="block">
            <h3>Scheme advisers</h3>
            <p className="block-note">
              The investment consultant&apos;s appointment date sets when their first performance review is due.
            </p>
            <hr className="rule" />
            {ADVISERS.map((a) => {
              const adviserContacts = contactList.filter((c) => c.adviser === a.id);
              return (
                <div key={a.id} style={{ marginBottom: 26 }}>
                  <h4 style={{ fontSize: 16, marginBottom: 10 }}>{a.label}</h4>
                  <form action={updateAdviser}>
                    <input type="hidden" name="scheme_id" value={schemeId} />
                    <input type="hidden" name="adviser" value={a.id} />
                    <div className="field-grid">
                      <div className="field">
                        <label htmlFor={`${a.id}_name`}>Name / firm</label>
                        <input id={`${a.id}_name`} name="name" defaultValue={(scheme as any)[a.nameColumn] || ""} />
                      </div>
                      <div className="field">
                        <label htmlFor={`${a.id}_date`}>Appointed on</label>
                        <input
                          id={`${a.id}_date`}
                          name="appointed_date"
                          type="date"
                          defaultValue={(scheme as any)[a.dateColumn] || ""}
                        />
                      </div>
                    </div>
                    <button className="btn small" type="submit">
                      Save
                    </button>
                  </form>

                  <p className="block-note" style={{ margin: "14px 0 4px" }}>Key contacts</p>
                  {adviserContacts.length === 0 ? (
                    <p className="notes" style={{ margin: 0 }}>None added yet.</p>
                  ) : (
                    adviserContacts.map((c) => (
                      <div className="member-row" key={c.id}>
                        <span>
                          <b>{c.name}</b>
                          {c.role ? ` · ${c.role}` : ""}
                          {c.email && (
                            <>
                              {" · "}
                              <a href={`mailto:${c.email}`}>{c.email}</a>
                            </>
                          )}
                        </span>
                        <form action={removeAdviserContact}>
                          <input type="hidden" name="scheme_id" value={schemeId} />
                          <input type="hidden" name="contact_id" value={c.id} />
                          <button className="btn danger small" type="submit">
                            Remove
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                  <details style={{ marginTop: 10 }}>
                    <summary className="btn small" style={{ display: "inline-block", listStyle: "none", cursor: "pointer" }}>
                      + Add a contact
                    </summary>
                    <form action={addAdviserContact} style={{ marginTop: 12 }}>
                      <input type="hidden" name="scheme_id" value={schemeId} />
                      <input type="hidden" name="adviser" value={a.id} />
                      <div className="field-grid">
                        <div className="field">
                          <label htmlFor={`${a.id}_contact_name`}>Name</label>
                          <input id={`${a.id}_contact_name`} name="name" required />
                        </div>
                        <div className="field">
                          <label htmlFor={`${a.id}_contact_role`}>Role (optional)</label>
                          <input id={`${a.id}_contact_role`} name="role" placeholder="e.g. Scheme actuary" />
                        </div>
                      </div>
                      <div className="field">
                        <label htmlFor={`${a.id}_contact_email`}>Email</label>
                        <input id={`${a.id}_contact_email`} name="email" type="email" placeholder="name@example.com" />
                      </div>
                      <button className="btn primary small" type="submit">
                        Add contact
                      </button>
                    </form>
                  </details>
                </div>
              );
            })}
          </section>

          {/* Objectives */}
          <section className="block">
            <h3>Objectives on file</h3>
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

          {/* Compliance check */}
          <section className="block" id="compliance-check">
            <h3>Compliance check</h3>
            <p className="block-note">Worked out from the entries above.</p>
            <hr className="rule" />
            {complianceChecks(scheme as any, objs, revs, revis).map((c) => (
              <div className={`check-row ${c.status}`} key={c.title}>
                <span className={`dot ${c.status}`} />
                <span>
                  <span className="check-title">{c.title}</span>
                  <span className="check-text">{c.text}</span>
                </span>
              </div>
            ))}
          </section>

          {/* Annual reports */}
          <section className="block" id="annual-reports">
            <h3>Annual reports</h3>
            <p className="block-note">
              Shared with everyone who has access to this scheme. To edit a report, download it, make your changes
              and upload it as a new version. Earlier versions are kept. Add a publication date when uploading
              the published version; the reminders below are based on it.
            </p>
            <hr className="rule" />
            <div style={{ marginBottom: 26 }}>
              {publicationChecks(docs, tcfdRequired).map((c) => (
                <div className={`check-row ${c.status}`} key={c.title}>
                  <span className={`dot ${c.status}`} />
                  <span>
                    <span className="check-title">{c.title}</span>
                    <span className="check-text">{c.text}</span>
                  </span>
                </div>
              ))}
            </div>
            {docTypesFor(tcfdRequired).map((t) => {
              const typeDocs = docs.filter((d) => d.doc_type === t.id);
              return (
                <div key={t.id} style={{ marginBottom: 26 }}>
                  <h4 style={{ fontSize: 16, marginBottom: 2 }}>{t.label}</h4>
                  <p className="block-note" style={{ marginBottom: 8 }}>{t.note}</p>
                  {typeDocs.length === 0 ? (
                    <div className="empty-state">Nothing uploaded yet.</div>
                  ) : (
                    typeDocs.map((d, i) => (
                      <div className="log-entry" key={d.id}>
                        <span className="log-date">{d.report_year || "—"}</span>
                        <span>
                          <a href={`/schemes/${schemeId}/documents/${d.id}`}>{d.file_name}</a>
                          {i === 0 && <span className="badge">latest</span>}
                          <span className="flags" style={{ marginTop: 4 }}>
                            <span className={"flag" + (d.published_on ? "" : " off")}>
                              {d.published_on ? `Published ${fmt(d.published_on)}` : "Draft"}
                            </span>
                          </span>
                          <span className="notes" style={{ display: "block", fontSize: 12.5 }}>
                            Uploaded {fmt(String(d.created_at).slice(0, 10))}
                            {d.uploaded_by_email ? ` by ${d.uploaded_by_email}` : ""}
                            {d.size_bytes ? ` · ${fileSize(d.size_bytes)}` : ""}
                          </span>
                          {d.notes && <span className="notes" style={{ display: "block" }}>{d.notes}</span>}
                        </span>
                        <form action={deleteDocument}>
                          <input type="hidden" name="scheme_id" value={schemeId} />
                          <input type="hidden" name="document_id" value={d.id} />
                          <button className="btn danger small" type="submit">
                            Remove
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                  <details style={{ marginTop: 12 }}>
                    <summary className="btn" style={{ display: "inline-block", listStyle: "none", cursor: "pointer" }}>
                      {typeDocs.length === 0 ? "+ Upload" : "+ Upload a new version"}
                    </summary>
                    <DocumentUpload schemeId={schemeId} docType={t.id} />
                  </details>
                </div>
              );
            })}
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
