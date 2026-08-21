'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/slug';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function nextUnsortedId(afterId: string) {
  const supabase = await createClient();

  // Prefer the next unsorted placemark after the current one so the queue
  // reads top-to-bottom; fall back to the first unsorted placemark once the
  // list wraps around.
  const { data: current } = await supabase
    .from('placemarks')
    .select('created_at')
    .eq('id', afterId)
    .single();

  if (current) {
    const { data: after } = await supabase
      .from('placemarks')
      .select('id')
      .eq('needs_review', true)
      .is('deleted_at', null)
      .gt('created_at', current.created_at)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (after) return after.id as string;
  }

  const { data: first } = await supabase
    .from('placemarks')
    .select('id')
    .eq('needs_review', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return (first?.id as string | undefined) ?? null;
}

export async function updatePlacemark(id: string, formData: FormData) {
  const categoryId = formData.get('category_id');
  const description = formData.get('description');

  const supabase = await createClient();
  const { error } = await supabase
    .from('placemarks')
    .update({
      category_id: categoryId ? String(categoryId) : null,
      description: description ? String(description) : null,
      needs_review: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  revalidatePath('/review');
  const next = await nextUnsortedId(id);
  redirect(next ? `/review?id=${next}` : '/review');
}

export async function skipPlacemark(id: string) {
  const next = await nextUnsortedId(id);
  redirect(next ? `/review?id=${next}` : '/review');
}

function readPlacemarkFields(formData: FormData) {
  const priorityRaw = formData.get('priority');
  return {
    name: String(formData.get('name') ?? '').trim(),
    categoryId: formData.get('category_id')
      ? String(formData.get('category_id'))
      : null,
    description: formData.get('description')
      ? String(formData.get('description'))
      : null,
    priority: priorityRaw ? Number(priorityRaw) : null,
    externalUrl: formData.get('external_url')
      ? String(formData.get('external_url'))
      : null,
    tagIds: formData.getAll('tag_id').map(String),
    tagNames: formData.getAll('tag_name').map(String).filter(Boolean),
  };
}

// Tags have no uniqueSlug-with-suffix behaviour like categories — a tag
// input is find-or-create, not always-create-new, so an existing slug match
// is reused rather than disambiguated.
async function findOrCreateTags(
  supabase: SupabaseServerClient,
  ownerId: string,
  names: string[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const slug = slugify(name);

    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle();
    if (existing) {
      ids.push(existing.id as string);
      continue;
    }

    const { data: created, error } = await supabase
      .from('tags')
      .insert({ id: crypto.randomUUID(), owner_id: ownerId, name, slug })
      .select('id')
      .single();
    if (error) throw error;
    ids.push(created.id as string);
  }
  return ids;
}

// Junction rows are the documented exception to "never hard delete"
// (sl-maps-schema-design.md §5.4) — a placemark's tag list is replace-all,
// not diffed.
async function replacePlacemarkTags(
  supabase: SupabaseServerClient,
  placemarkId: string,
  tagIds: string[],
) {
  const { error: deleteError } = await supabase
    .from('placemark_tags')
    .delete()
    .eq('placemark_id', placemarkId);
  if (deleteError) throw deleteError;

  const uniqueIds = [...new Set(tagIds)];
  if (uniqueIds.length === 0) return;

  const { error: insertError } = await supabase
    .from('placemark_tags')
    .insert(
      uniqueIds.map((tagId) => ({ placemark_id: placemarkId, tag_id: tagId })),
    );
  if (insertError) throw insertError;
}

// Called imperatively from the map's add-placemark form (not bound to a
// <form action>), so it returns a result instead of redirecting.
export async function createPlacemark(
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'not_authenticated' };

  const {
    name,
    categoryId,
    description,
    priority,
    externalUrl,
    tagIds,
    tagNames,
  } = readPlacemarkFields(formData);

  if (!name) return { error: 'Name is required.' };
  if (!categoryId) return { error: 'Choose a category.' };

  const lat = Number(formData.get('lat'));
  const lon = Number(formData.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { error: 'A location is required.' };
  }

  const { data, error } = await supabase
    .from('placemarks')
    .insert({
      owner_id: user.id,
      name,
      category_id: categoryId,
      description,
      // PostGIS's geometry input function parses EWKT text directly, so a
      // plain point insert needs no RPC. `anchor` is a generated/STORED
      // column derived from this and must never be set directly.
      geom: `SRID=4326;POINT(${lon} ${lat})`,
      priority,
      external_url: externalUrl,
      source: 'manual',
    })
    .select('id')
    .single();
  if (error) return { error: error.message };

  const createdTagIds = tagNames.length
    ? await findOrCreateTags(supabase, user.id, tagNames)
    : [];
  const allTagIds = [...tagIds, ...createdTagIds];
  if (allTagIds.length > 0)
    await replacePlacemarkTags(supabase, data.id as string, allTagIds);

  revalidatePath('/review');
  return { id: data.id as string };
}

// General-purpose placemark edit (name, category, description, priority,
// external URL, tags), used by the map's edit panel and its
// autosave-on-blur. Distinct from `updatePlacemark` above, which is the
// narrower /review-queue action (category + description only) that still
// relies on redirect()-based navigation to the next unsorted placemark —
// broadening that one in place would break the review flow's form.
export async function savePlacemark(
  id: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'not_authenticated' };

  const {
    name,
    categoryId,
    description,
    priority,
    externalUrl,
    tagIds,
    tagNames,
  } = readPlacemarkFields(formData);
  if (!name) return { error: 'Name is required.' };
  if (!categoryId) return { error: 'Choose a category.' };

  const { error } = await supabase
    .from('placemarks')
    .update({
      name,
      category_id: categoryId,
      description,
      priority,
      external_url: externalUrl,
      needs_review: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };

  const createdTagIds = tagNames.length
    ? await findOrCreateTags(supabase, user.id, tagNames)
    : [];
  await replacePlacemarkTags(supabase, id, [...tagIds, ...createdTagIds]);

  revalidatePath('/review');
  return { ok: true };
}

// Soft delete only — mirrors deleteCategory's convention. No dependent
// reassignment is needed: nothing else must be repointed before a placemark
// can be removed.
export async function deletePlacemark(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('placemarks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/review');
  return { ok: true };
}

// `visited`/`visit_count`/`last_visited_on` are generated/trigger-maintained
// from the `visits` table (sl-maps-schema-design.md §5.3/§5.5) — there is no
// boolean to write directly. Logging a visit is an insert here, not a field
// update.
export async function logVisit(
  placemarkId: string,
  visitedOn: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'not_authenticated' };

  const { error } = await supabase.from('visits').insert({
    placemark_id: placemarkId,
    owner_id: user.id,
    visited_on: visitedOn,
  });
  if (error) return { error: error.message };

  return { ok: true };
}
