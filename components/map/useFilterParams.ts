'use client';

import { useSearchParams } from 'next/navigation';
import { useFilterTransition } from './FilterTransitionContext';

export type VisitedStatus = 'all' | 'visited' | 'not_visited';

export type NearPoint = { lat: number; lon: number };

const DEFAULT_RADIUS_M = 50_000;

function parseNear(raw: string): NearPoint | null {
  const [latStr, lonStr] = raw.split(',');
  const lat = Number(latStr);
  const lon = Number(lonStr);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

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

  const query = searchParams.get('q') ?? '';
  const nearParam = searchParams.get('near');
  const near = nearParam ? parseNear(nearParam) : null;
  const radiusM = Number(searchParams.get('radius')) || DEFAULT_RADIUS_M;
  const place = searchParams.get('place');
  const proximityEnabled = searchParams.get('proximity') === '1';

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

  function setQuery(q: string) {
    updateParams((params) => {
      if (q.trim()) params.set('q', q.trim());
      else params.delete('q');
    });
  }

  // Proximity search is opt-in (via the search box's toggle) and runs
  // alongside `q`, not instead of it — the placemarks_search RPC already
  // supports both predicates at once, so `q` is left untouched here.
  function setNear(
    lat: number,
    lon: number,
    opts?: { radiusM?: number; place?: string },
  ) {
    updateParams((params) => {
      params.set('near', `${lat.toFixed(5)},${lon.toFixed(5)}`);
      params.set('radius', String(Math.round(opts?.radiusM ?? DEFAULT_RADIUS_M)));
      if (opts?.place) params.set('place', opts.place);
      else params.delete('place');
    });
  }

  function setRadius(radiusMeters: number) {
    updateParams((params) => {
      params.set('radius', String(Math.round(radiusMeters)));
    });
  }

  // Clears only the proximity search (near/radius/place), leaving `q` and
  // the proximity toggle itself alone — used when the toggle is switched
  // off without the user clearing their text search too.
  function clearNear() {
    updateParams((params) => {
      params.delete('near');
      params.delete('radius');
      params.delete('place');
    });
  }

  function clearSearch() {
    updateParams((params) => {
      params.delete('q');
      params.delete('near');
      params.delete('radius');
      params.delete('place');
    });
  }

  // A sticky mode preference, not tied to any one search session — left
  // untouched by clearAll()/clearSearch() so it survives across searches.
  function setProximityEnabled(enabled: boolean) {
    updateParams((params) => {
      if (enabled) params.set('proximity', '1');
      else params.delete('proximity');
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
    query,
    near,
    radiusM,
    place,
    proximityEnabled,
    setQuery,
    setNear,
    setRadius,
    clearNear,
    clearSearch,
    setProximityEnabled,
  };
}
