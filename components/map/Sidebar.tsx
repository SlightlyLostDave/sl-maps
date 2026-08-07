import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 1000;

type PlacemarkCategoryRow = {
  categories: { slug: string } | null;
};

async function getCategoryCounts() {
  const counts = new Map<string | null, number>();

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("placemarks")
      .select("categories(slug)")
      .is("deleted_at", null)
      .range(offset, offset + PAGE_SIZE - 1)
      .returns<PlacemarkCategoryRow[]>();

    if (error) throw error;
    for (const { categories } of data) {
      const category = categories?.slug ?? null;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    if (data.length < PAGE_SIZE) break;
  }

  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

const CATEGORY_STYLE: Record<string, { color: string; shape: string }> = {
  dive: { color: "var(--cat-dive)", shape: "50%" },
  urbex: { color: "var(--cat-urbex)", shape: "2px" },
  rock: { color: "var(--cat-rock)", shape: "2px" },
  heritage: { color: "var(--cat-heritage)", shape: "2px" },
  nature: { color: "var(--cat-nature)", shape: "2px" },
};

function categoryGlyph(category: string | null) {
  const style = category ? CATEGORY_STYLE[category] : undefined;
  if (!style) {
    return (
      <span className="h-2.25 w-2.25 shrink-0 rounded-full border-[3px] border-cat-none bg-background" />
    );
  }
  return (
    <span
      className="h-2.25 w-2.25 shrink-0"
      style={{ background: style.color, borderRadius: style.shape }}
    />
  );
}

export default async function Sidebar() {
  const categories = await getCategoryCounts();

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-bg-raised p-5">
      <h2 className="eyebrow">Explore</h2>
      <ul className="flex flex-col gap-1">
        {categories.map(({ category, count }) => (
          <li
            key={category ?? "uncategorized"}
            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-ink-dim transition-colors hover:bg-ground-2 hover:text-ink"
          >
            <span className="flex items-center gap-2">
              {categoryGlyph(category)}
              {category ?? "Uncategorized"}
            </span>
            <span className="font-mono text-xs text-ink-faint">{count}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
