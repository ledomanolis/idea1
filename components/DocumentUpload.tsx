"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DOCUMENTS_BUCKET } from "@/lib/documents";

// Uploads go straight from the browser to Supabase Storage, so large
// reports aren't limited by the server's request size.
export default function DocumentUpload({ schemeId, docType }: { schemeId: string; docType: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) return;

    setBusy(true);
    setErrorMsg("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
    const path = `${schemeId}/${docType}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
    });
    if (uploadError) {
      setBusy(false);
      setErrorMsg(uploadError.message);
      return;
    }

    const year = parseInt(String(data.get("report_year") || ""), 10);
    const { error: insertError } = await supabase.from("scheme_documents").insert({
      scheme_id: schemeId,
      doc_type: docType,
      report_year: isNaN(year) ? null : year,
      file_name: file.name,
      storage_path: path,
      size_bytes: file.size,
      notes: String(data.get("notes") || "").trim(),
      uploaded_by_email: user?.email || null,
    });

    if (insertError) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
      setBusy(false);
      setErrorMsg(insertError.message);
      return;
    }

    form.reset();
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
      <div className="field-grid">
        <div className="field">
          <label htmlFor={`${docType}_file`}>File</label>
          <input id={`${docType}_file`} name="file" type="file" required />
        </div>
        <div className="field">
          <label htmlFor={`${docType}_year`}>Year</label>
          <input
            id={`${docType}_year`}
            name="report_year"
            type="number"
            min={1990}
            max={2100}
            defaultValue={new Date().getFullYear()}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${docType}_notes`}>Notes (optional)</label>
        <input id={`${docType}_notes`} name="notes" placeholder="e.g. draft for trustee comments" />
      </div>
      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? "Uploading…" : "Upload"}
      </button>
      {errorMsg && <p className="block-note" style={{ color: "var(--brick)", marginTop: 10 }}>{errorMsg}</p>}
    </form>
  );
}
