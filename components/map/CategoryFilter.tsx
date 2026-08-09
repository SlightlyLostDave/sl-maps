'use client';

import { useFilterParams } from './useFilterParams';
import type { CategoryItem } from './FilterPanel';

function CategoryRow({
  category,
  active,
  onToggle,
  indent,
}: {
  category: CategoryItem;
  active: boolean;
  onToggle: () => void;
  indent: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
          indent ? 'ml-6' : ''
        } ${
          active
            ? 'bg-crimson-wash text-ink'
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
        <span className="font-mono text-xs text-ink-faint">
          {category.count}
        </span>
      </button>
    </li>
  );
}

export default function CategoryFilter({
  categories,
}: {
  categories: CategoryItem[];
}) {
  const { activeCatIds, toggleCategory, setCategoryIds } = useFilterParams();

  const topLevel = categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const childrenOf = (id: string) =>
    categories
      .filter((c) => c.parentId === id)
      .sort((a, b) => a.name.localeCompare(b.name));
  const allIds = categories.map((c) => c.id);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between">
        <h3 className="eyebrow">Categories</h3>
        <div className="flex items-center gap-2 font-mono text-xs text-ink-faint">
          <button
            type="button"
            onClick={() => setCategoryIds(allIds)}
            className="hover:text-ink"
          >
            All
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setCategoryIds([])}
            className="hover:text-ink"
          >
            Clear
          </button>
        </div>
      </div>
      <ul className="themed-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {topLevel.map((category) => (
          <li key={category.id}>
            <ul className="flex flex-col gap-1">
              <CategoryRow
                category={category}
                active={activeCatIds.has(category.id)}
                onToggle={() => toggleCategory(category.id)}
                indent={false}
              />
              {childrenOf(category.id).map((child) => (
                <CategoryRow
                  key={child.id}
                  category={child}
                  active={activeCatIds.has(child.id)}
                  onToggle={() => toggleCategory(child.id)}
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
    </div>
  );
}
