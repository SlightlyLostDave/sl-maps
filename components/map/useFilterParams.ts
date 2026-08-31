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

  // Clears `q` on purpose: this is a pivot to proximity mode (typed
  // coordinates, or accepting the geocode suggestion chip) — the original
  // free text is no longer a meaningful name/description/tag filter once
  // the intent has resolved to "near this place", and keeping it would AND
  // an unrelated text predicate onto the proximity query.
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
      params.delete('q');
    });
  }

  function setRadius(radiusMeters: number) {
    updateParams((params) => {
      params.set('radius', String(Math.round(radiusMeters)));
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
    setQuery,
    setNear,
    setRadius,
    clearSearch,
  };
}
