'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@lib/supabase/server';
import { slugify } from '@lib/slug';
import hugeiconsNames from '@lib/map/hugeiconsNames.json';

const hugeiconsNameSet = new Set(hugeiconsNames as string[]);
function iconExists(name: string) {
  return hugeiconsNameSet.has(name);
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function uniqueSlug(
  supabase: SupabaseServerClient,
  ownerId: string,
  base: string,
) {
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('slug', candidate)
      .is('deleted_at', null)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

function parseAttributesSchema(
  raw: FormDataEntryValue | null,
): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(String(raw ?? '{}'));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readCategoryFields(formData: FormData) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    color: String(formData.get('color') || '#7C9A55'),
    icon: formData.get('icon') ? String(formData.get('icon')) : null,
    parentId: formData.get('parent_id')
      ? String(formData.get('parent_id'))
      : null,
    sortOrder: Number(formData.get('sort_order') ?? 0),
    attributesSchema: parseAttributesSchema(formData.get('attributes_schema')),
  };
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { name, color, icon, parentId, sortOrder, attributesSchema } =
    readCategoryFields(formData);

  if (!name) redirect('/categories?id=new&error=name_required');
  if (attributesSchema === null)
    redirect('/categories?id=new&error=invalid_json');
  if (icon && !iconExists(icon))
    redirect('/categories?id=new&error=invalid_icon');

  if (parentId) {
    const { data: parent } = await supabase
      .from('categories')
      .select('parent_id')
      .eq('id', parentId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!parent || parent.parent_id)
      redirect('/categories?id=new&error=has_children');
  }

  const slug = await uniqueSlug(supabase, user.id, slugify(name, 'category'));

  const { data, error } = await supabase
    .from('categories')
    .insert({
      owner_id: user.id,
      name,
      slug,
      color,
      icon,
      parent_id: parentId,
      sort_order: sortOrder,
      attributes_schema: attributesSchema,
    })
    .select('id')
    .single();
  if (error) throw error;

  revalidatePath('/categories');
  revalidatePath('/');
  redirect(`/categories?id=${data.id}`);
}

// Used by the placemark form's inline "+ New category" affordance — unlike
// createCategory, this must not redirect (it would blow away the in-progress
// placemark form), so it returns the created row instead.
export async function createCategoryQuick(
  formData: FormData,
): Promise<{ id: string; name: string; color: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'not_authenticated' };

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'name_required' };
  const color = String(formData.get('color') || '#7C9A55');

  const slug = await uniqueSlug(supabase, user.id, slugify(name, 'category'));
  const { data, error } = await supabase
    .from('categories')
    .insert({ owner_id: user.id, name, slug, color })
    .select('id, name, color')
    .single();
  if (error) return { error: error.message };

  revalidatePath('/categories');
  revalidatePath('/');
  return data;
}

export async function updateCategory(id: string, formData: FormData) {
  const supabase = await createClient();

  const { name, color, icon, parentId, sortOrder, attributesSchema } =
    readCategoryFields(formData);

  if (!name) redirect(`/categories?id=${id}&error=name_required`);
  if (attributesSchema === null)
    redirect(`/categories?id=${id}&error=invalid_json`);
  if (icon && !iconExists(icon))
    redirect(`/categories?id=${id}&error=invalid_icon`);

  const { count: childCount } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id)
    .is('deleted_at', null);

  if (parentId) {
    if (parentId === id || (childCount ?? 0) > 0) {
      redirect(`/categories?id=${id}&error=has_children`);
    }
    const { data: parent } = await supabase
      .from('categories')
      .select('parent_id')
      .eq('id', parentId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!parent || parent.parent_id) {
      redirect(`/categories?id=${id}&error=has_children`);
    }
  }

  const { error } = await supabase
    .from('categories')
    .update({
      name,
      color,
      icon,
      parent_id: parentId,
      sort_order: sortOrder,
      attributes_schema: attributesSchema,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;

  revalidatePath('/categories');
  revalidatePath('/');
  redirect(`/categories?id=${id}`);
}

export async function deleteCategory(id: string, formData: FormData) {
  const supabase = await createClient();

  const { count: childCount } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id)
    .is('deleted_at', null);
  if ((childCount ?? 0) > 0)
    redirect(`/categories?id=${id}&error=has_children`);

  const { count: placemarkCount } = await supabase
    .from('placemarks')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
    .is('deleted_at', null);

  if ((placemarkCount ?? 0) > 0) {
    const replacementId = formData.get('replacement_category_id');
    if (!replacementId)
      redirect(`/categories?id=${id}&error=needs_replacement`);

    const { error: reassignError } = await supabase
      .from('placemarks')
      .update({
        category_id: String(replacementId),
        updated_at: new Date().toISOString(),
      })
      .eq('category_id', id)
      .is('deleted_at', null);
    if (reassignError) throw reassignError;
  }

  const { error } = await supabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;

  revalidatePath('/categories');
  revalidatePath('/');
  redirect('/categories');
}
