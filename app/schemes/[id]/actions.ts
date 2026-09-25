"use server";

import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/documents";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateDetails(formData: FormData) {
  const schemeId = String(formData.get("scheme_id"));
  const supabase = createClient();

  const { error } = await supabase
    .from("schemes")
    .update({
      name: String(formData.get("name") || "").trim(),
    })
    .eq("id", schemeId);

  if (error) throw new Error(error.message);
  revalidatePath(`/schemes/${schemeId}`);
  revalidatePath("/schemes");
}

export async function updateAdvisers(formData: FormData) {
  const schemeId = String(formData.get("scheme_id"));
  const supabase = createClient();

  const text = (key: string) => String(formData.get(key) || "").trim();
  const date = (key: string) => String(formData.get(key) || "") || null;

  const { error } = await supabase
    .from("schemes")
    .update({
      admin_name: text("admin_name"),
      admin_appointed_date: date("admin_appointed_date"),
      provider_name: text("provider_name"),
      appointed_date: date("appointed_date"),
      actuary_name: text("actuary_name"),
      actuary_appointed_date: date("actuary_appointed_date"),
    })
    .eq("id", schemeId);

  if (error) throw new Error(error.message);
  revalidatePath(`/schemes/${schemeId}`);
  revalidatePath("/schemes");
}

export async function addObjective(formData: FormData) {
  const schemeId = String(formData.get("scheme_id"));
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  const { error } = await supabase.from("objectives").insert({
    scheme_id: schemeId,
    category: String(formData.get("category") || "investments"),
    body,
    date_set: String(formData.get("date_set") || "") || new Date().toISOString().slice(0, 10),
    created_by: user?.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/schemes/${schemeId}`);
  revalidatePath("/schemes");
}

export async function deleteObjective(formData: FormData) {
  const schemeId = String(formData.get("scheme_id"));
  const objectiveId = String(formData.get("objective_id"));
  const supabase = createClient();

  const { error } = await supabase.from("objectives").delete().eq("id", objectiveId);
  if (error) throw new Error(error.message);
  revalidatePath(`/schemes/${schemeId}`);
  revalidatePath("/schemes");
}

export async function addReview(formData: FormData) {
  const schemeId = String(formData.get("scheme_id"));
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("reviews").insert({
    scheme_id: schemeId,
    review_date: String(formData.get("review_date") || "") || new Date().toISOString().slice(0, 10),
    services_reviewed: formData.get("services_reviewed") === "on",
    notes: String(formData.get("notes") || "").trim(),
    created_by: user?.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/schemes/${schemeId}`);
  revalidatePath("/schemes");
}

export async function addRevision(formData: FormData) {
  const schemeId = String(formData.get("scheme_id"));
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("revisions").insert({
    scheme_id: schemeId,
    review_date: String(formData.get("review_date") || "") || new Date().toISOString().slice(0, 10),
    changed: formData.get("changed") === "on",
    notes: String(formData.get("notes") || "").trim(),
    created_by: user?.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/schemes/${schemeId}`);
  revalidatePath("/schemes");
}

export async function inviteMember(formData: FormData) {
  const schemeId = String(formData.get("scheme_id"));
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return;

  const supabase = createClient();

  // Link straight away if this person already has an account.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  const { error } = await supabase.from("scheme_members").insert({
    scheme_id: schemeId,
    invited_email: email,
    user_id: existingProfile?.id || null,
    role: "editor",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/schemes/${schemeId}`);
}

export async function removeMember(formData: FormData) {
  const schemeId = String(formData.get("scheme_id"));
  const memberId = String(formData.get("member_id"));
  const supabase = createClient();

  const { error } = await supabase.from("scheme_members").delete().eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath(`/schemes/${schemeId}`);
}

export async function deleteDocument(formData: FormData) {
  const schemeId = String(formData.get("scheme_id"));
  const documentId = String(formData.get("document_id"));
  const supabase = createClient();

  const { data: doc } = await supabase
    .from("scheme_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return;

  const { error: storageError } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path]);
  if (storageError) throw new Error(storageError.message);

  const { error } = await supabase.from("scheme_documents").delete().eq("id", documentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/schemes/${schemeId}`);
}

export async function deleteScheme(formData: FormData) {
  const schemeId = String(formData.get("scheme_id"));
  const supabase = createClient();

  // Document rows go with the scheme (on delete cascade), but the stored
  // files don't, so remove those first.
  const { data: docs } = await supabase.from("scheme_documents").select("storage_path").eq("scheme_id", schemeId);
  if (docs && docs.length) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove(docs.map((d) => d.storage_path));
  }

  const { error } = await supabase.from("schemes").delete().eq("id", schemeId);
  if (error) throw new Error(error.message);
  revalidatePath("/schemes");
  redirect("/schemes");
}
