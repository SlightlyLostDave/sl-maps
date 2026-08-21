'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import CategoryFilter from './CategoryFilter';
import StatusFilter from './StatusFilter';
import SearchField from './SearchField';
import { useFilterParams } from './useFilterParams';

export type CategoryItem = {
  id: string;
  slug: string;
  name: string;
  color: string;
  parentId: string | null;
  count: number;
};

function useMatchCount(activeCatIds: Set<string>, visitedStatus: string) {
  const [matchingCount, setMatchingCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      let query = supabase
        .from('placemarks')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      if (activeCatIds.size > 0)
        query = query.in('category_id', [...activeCatIds]);
      if (visitedStatus !== 'all')
        query = query.eq('visited', visitedStatus === 'visited');

      const { count, error } = await query;
      if (!cancelled && !error) setMatchingCount(count ?? 0);
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeCatIds, visitedStatus]);

  return matchingCount;
}

export default function FilterPanel({
  categories,
  totalCount,
  visitedCount,
  notVisitedCount,
}: {
  categories: CategoryItem[];
  totalCount: number;
  visitedCount: number;
  notVisitedCount: number;
}) {
  const { activeCatIds, visitedStatus, activeFilterCount, clearAll } =
    useFilterParams();
  const matchingCount = useMatchCount(activeCatIds, visitedStatus);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <h2 className="eyebrow">Filters</h2>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="font-mono text-xs text-ink-faint hover:text-ink"
          >
            Clear all
          </button>
        )}
      </div>

      <p className="shrink-0 font-mono text-xs text-ink-faint">
        <span className="text-ink">{matchingCount ?? '…'}</span> of {totalCount}{' '}
        placemarks
      </p>

      <div className="shrink-0">
        <SearchField />
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t border-line pt-3">
        <CategoryFilter categories={categories} />
      </div>

      <div className="shrink-0 border-t border-line pt-3">
        <StatusFilter
          visitedCount={visitedCount}
          notVisitedCount={notVisitedCount}
        />
      </div>
    </div>
  );
}
