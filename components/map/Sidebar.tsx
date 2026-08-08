import { createClient } from "@/lib/supabase/server";
import { assignCategoryShapes } from "@/lib/map/categoryStyle";
import SidebarShell from "./SidebarShell";
import FilterPanel, { type CategoryItem } from "./FilterPanel";

const PAGE_SIZE = 1000;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getCategoryCounts(supabase: SupabaseServerClient) {
  const counts = new Map<string, number>();

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("placemarks")
      .select("category_id")
      .is("deleted_at", null)
      .range(offset, offset + PAGE_SIZE - 1)
      .returns<{ category_id: string }[]>();

    if (error) throw error;
    for (const { category_id } of data) {
      counts.set(category_id, (counts.get(category_id) ?? 0) + 1);
    }
    if (data.length < PAGE_SIZE) break;
  }

  return counts;
}

export default async function Sidebar() {
  const supabase = await createClient();

  const [{ data: categories, error }, counts] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name, color, sort_order")
      .is("deleted_at", null)
      .order("sort_order")
      .returns<{ id: string; slug: string; name: string; color: string; sort_order: number }[]>(),
    getCategoryCounts(supabase),
  ]);

  if (error) throw error;

  const styles = assignCategoryShapes(categories ?? []);
  const items: CategoryItem[] = (categories ?? []).map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    color: category.color,
    shape: styles.get(category.id)!.shape,
    count: counts.get(category.id) ?? 0,
  }));

  return (
    <SidebarShell>
      <FilterPanel categories={items} />
    </SidebarShell>
  );
}
