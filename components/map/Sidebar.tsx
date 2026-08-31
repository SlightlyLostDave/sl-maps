import { createClient } from '@lib/supabase/server';
import SidebarShell from './SidebarShell';
import FilterPanel, { type CategoryItem } from './FilterPanel';
import SearchBox from './SearchBox';
import SearchResultsList from './SearchResultsList';

const PAGE_SIZE = 1000;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type Aggregates = {
  categoryCounts: Map<string, number>;
  totalCount: number;
  visitedCount: number;
};

async function getAggregates(
  supabase: SupabaseServerClient,
): Promise<Aggregates> {
  const categoryCounts = new Map<string, number>();
  let totalCount = 0;
  let visitedCount = 0;

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('placemarks')
      .select('category_id, visited')
      .is('deleted_at', null)
      .range(offset, offset + PAGE_SIZE - 1)
      .returns<{ category_id: string; visited: boolean }[]>();

    if (error) throw error;

    for (const { category_id, visited } of data) {
      categoryCounts.set(
        category_id,
        (categoryCounts.get(category_id) ?? 0) + 1,
      );
      totalCount += 1;

      if (visited) visitedCount += 1;
    }

    if (data.length < PAGE_SIZE) break;
  }

  return { categoryCounts, totalCount, visitedCount };
}

export default async function Sidebar() {
  const supabase = await createClient();

  const [{ data: categories, error }, aggregates] = await Promise.all([
    supabase
      .from('categories')
      .select('id, slug, name, color, parent_id, sort_order')
      .is('deleted_at', null)
      .order('sort_order')
      .returns<
        {
          id: string;
          slug: string;
          name: string;
          color: string;
          parent_id: string | null;
          sort_order: number;
        }[]
      >(),
    getAggregates(supabase),
  ]);

  if (error) throw error;

  const items: CategoryItem[] = (categories ?? []).map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    color: category.color,
    parentId: category.parent_id,
    count: aggregates.categoryCounts.get(category.id) ?? 0,
  }));

  return (
    <SidebarShell>
      <SearchBox />
      <SearchResultsList />
      <FilterPanel
        categories={items}
        totalCount={aggregates.totalCount}
        visitedCount={aggregates.visitedCount}
        notVisitedCount={aggregates.totalCount - aggregates.visitedCount}
      />
    </SidebarShell>
  );
}
