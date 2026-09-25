import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/documents";
import { NextResponse } from "next/server";

// Downloads a scheme document. Row-level security means this only finds
// the document if the signed-in user is a member of its scheme; the file
// is then served through a short-lived signed link.
export async function GET(_request: Request, { params }: { params: { id: string; docId: string } }) {
  const supabase = createClient();

  const { data: doc } = await supabase
    .from("scheme_documents")
    .select("storage_path, file_name")
    .eq("id", params.docId)
    .eq("scheme_id", params.id)
    .maybeSingle();

  if (!doc) return new NextResponse("Document not found", { status: 404 });

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, 60, { download: doc.file_name });

  if (error || !data) return new NextResponse("Could not open document", { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
