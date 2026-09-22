"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createScheme(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
console.log("DEBUG user id:", user.id);
  const { data: authCheck } = await supabase.rpc("debug_auth"); console.log("DEBUG auth check:", JSON.stringify(authCheck));
  const { data, error } = await supabase
    .from("schemes")
    .insert({ name, created_by: user!.id })
    .select("id")
    .single();
console.log("DEBUG insert error:", JSON.stringify(error));
  if (error || !data) {
    throw new Error(error?.message || "Could not create scheme");
  }

  revalidatePath("/schemes");
  redirect(`/schemes/${data.id}`);
}
