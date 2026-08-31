import CategoryNavLink from './CategoryNavLink';
import { createClient } from '@lib/supabase/server';

const PAGE_SIZE = 1000;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  color: string;
  parent_id: string | null;
  sort_order: number;
};

async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, color, parent_id, sort_order')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .returns<CategoryRow[]>();

  if (error) throw error;
  return data;
}

async function getCategoryCounts(supabase: SupabaseServerClient) {
  const counts = new Map<string, number>();

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('placemarks')
      .select('category_id')
      .is('deleted_at', null)
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

function CategoryRowLink({
  category,
  isSelected,
  count,
  indent,
}: {
  category: CategoryRow;
  isSelected: boolean;
  count: number;
  indent: boolean;
}) {
  return (
    <li>
      <CategoryNavLink
        href={`/categories?id=${category.id}`}
        className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
          indent ? 'ml-6' : ''
        } ${
          isSelected
            ? 'bg-ground-2 text-ink'
            : 'text-ink-dim hover:bg-ground-2 hover:text-ink'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: category.color }}
          />
          <span className="truncate">{category.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-xs text-ink-faint">
            {category.slug}
          </span>
          <span className="font-mono text-xs text-ink-faint">{count}</span>
        </span>
      </CategoryNavLink>
    </li>
  );
}

export default async function CategoryList({
  selectedId,
}: {
  selectedId?: string;
}) {
  const supabase = await createClient();
  const [categories, counts] = await Promise.all([
    getCategories(),
    getCategoryCounts(supabase),
  ]);

  const topLevel = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const childrenOf = (id: string) =>
    categories
      .filter((c) => c.parent_id === id)
      .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <aside className="flex w-80 shrink-0 min-h-0 flex-col gap-4 border-r border-line bg-bg-raised p-5">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow mb-1">Categories</h2>
        <CategoryNavLink
          href="/categories?id=new"
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            selectedId === 'new'
              ? 'bg-ground-2 text-ink'
              : 'text-ink-dim hover:bg-ground-2 hover:text-ink'
          }`}
        >
          + New category
        </CategoryNavLink>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {topLevel.map((category) => (
          <li key={category.id}>
            <ul className="flex flex-col gap-1">
              <CategoryRowLink
                category={category}
                isSelected={category.id === selectedId}
                count={counts.get(category.id) ?? 0}
                indent={false}
              />
              {childrenOf(category.id).map((child) => (
                <CategoryRowLink
                  key={child.id}
                  category={child}
                  isSelected={child.id === selectedId}
                  count={counts.get(child.id) ?? 0}
                  indent
                />
              ))}
            </ul>
          </li>
        ))}
        {categories.length === 0 && (
          <li className="px-2 py-1.5 text-sm text-ink-faint">
            No categories yet.
          </li>
        )}
      </ul>
    </aside>
  );
}
