import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { schemeChecks, worstStatus } from "@/lib/status";

export default async function Rail({ activeId }: { activeId?: string }) {
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

  function statusFor(schemeId: string) {
    const s = (schemes || []).find((x) => x.id === schemeId)!;
    return worstStatus(
      schemeChecks(
        s,
        (objectives || []).filter((o) => o.scheme_id === schemeId),
        (reviews || []).filter((r) => r.scheme_id === schemeId),
        (revisions || []).filter((r) => r.scheme_id === schemeId),
        (documents || []).filter((d) => d.scheme_id === schemeId)
      )
    );
  }

  return (
    <aside className="rail">
      <div className="rail-head">
        <h1>
          <Link href="/schemes">The Register</Link>
        </h1>
      </div>

      <Link href="/schemes" className={"rail-item" + (!activeId ? " active" : "")}>
        <span className="dot" style={{ background: "var(--ink)" }} />
        <span>
          <span className="name">Overview</span>
          <span className="sub">All schemes at a glance</span>
        </span>
      </Link>

      {(schemes || []).map((s) => (
        <Link key={s.id} href={`/schemes/${s.id}`} className={"rail-item" + (activeId === s.id ? " active" : "")}>
          <span className={"dot " + statusFor(s.id)} />
          <span className="name">{s.name}</span>
        </Link>
      ))}

      <div style={{ padding: "16px 24px" }}>
        <Link href="/schemes/new" className="btn" style={{ display: "inline-block", width: "100%", textAlign: "center", textDecoration: "none" }}>
          + Add a scheme
        </Link>
      </div>

      <form action="/auth/signout" method="post" style={{ padding: "0 24px" }}>
        <button className="btn" style={{ width: "100%" }} type="submit">
          Sign out
        </button>
      </form>
    </aside>
  );
}
