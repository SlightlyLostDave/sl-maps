"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function nextUnsortedId(afterId: string) {
  const supabase = await createClient();

  // Prefer the next unsorted placemark after the current one so the queue
  // reads top-to-bottom; fall back to the first unsorted placemark once the
  // list wraps around.
  const { data: current } = await supabase
    .from("placemarks")
    .select("created_at")
    .eq("id", afterId)
    .single();

  if (current) {
    const { data: after } = await supabase
      .from("placemarks")
      .select("id")
      .eq("needs_review", true)
      .is("deleted_at", null)
      .gt("created_at", current.created_at)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (after) return after.id as string;
  }

  const { data: first } = await supabase
    .from("placemarks")
    .select("id")
    .eq("needs_review", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (first?.id as string | undefined) ?? null;
}

export async function updatePlacemark(id: string, formData: FormData) {
  const categoryId = formData.get("category_id");
  const description = formData.get("description");

  const supabase = await createClient();
  const { error } = await supabase
    .from("placemarks")
    .update({
      category_id: categoryId ? String(categoryId) : null,
      description: description ? String(description) : null,
      needs_review: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/review");
  const next = await nextUnsortedId(id);
  redirect(next ? `/review?id=${next}` : "/review");
}

export async function skipPlacemark(id: string) {
  const next = await nextUnsortedId(id);
  redirect(next ? `/review?id=${next}` : "/review");
}
