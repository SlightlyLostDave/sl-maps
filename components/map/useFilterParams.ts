'use client';

import { useSearchParams } from 'next/navigation';
import { useFilterTransition } from './FilterTransitionContext';

export type VisitedStatus = 'all' | 'visited' | 'not_visited';

export function useFilterParams() {
  const searchParams = useSearchParams();
  const { startTransition } = useFilterTransition();

  const activeCatIds = new Set(
    (searchParams.get('cat') ?? '').split(',').filter(Boolean),
  );
  const visitedParam = searchParams.get('visited');
  const visitedStatus: VisitedStatus =
    visitedParam === '1'
      ? 'visited'
      : visitedParam === '0'
        ? 'not_visited'
        : 'all';

  const activeFilterCount =
    activeCatIds.size + (visitedStatus !== 'all' ? 1 : 0);

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    // Filters are pure client state (read by MapView/DetailDrawer, not the
    // server Page component), so update the URL via history.pushState
    // rather than router.push(). See the shallow-routing note in
    // MapView's point-click handler for why router.push() doesn't work
    // here: this route reads cookies (fully dynamic), and its RSC
    // round-trip can resolve without ever committing a same-page
    // search-param navigation.
    startTransition(() => {
      window.history.pushState(null, '', `?${params.toString()}`);
    });
  }

  function toggleCategory(id: string) {
    updateParams((params) => {
      const ids = new Set((params.get('cat') ?? '').split(',').filter(Boolean));
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      if (ids.size > 0) params.set('cat', [...ids].join(','));
      else params.delete('cat');
    });
  }

  function setCategoryIds(ids: string[]) {
    updateParams((params) => {
      if (ids.length > 0) params.set('cat', ids.join(','));
      else params.delete('cat');
    });
  }

  function setVisited(status: VisitedStatus) {
    updateParams((params) => {
      if (status === 'visited') params.set('visited', '1');
      else if (status === 'not_visited') params.set('visited', '0');
      else params.delete('visited');
    });
  }

  function clearAll() {
    updateParams((params) => {
      params.delete('cat');
      params.delete('visited');
    });
  }

  return {
    activeCatIds,
    visitedStatus,
    activeFilterCount,
    toggleCategory,
    setCategoryIds,
    setVisited,
    clearAll,
  };
}
