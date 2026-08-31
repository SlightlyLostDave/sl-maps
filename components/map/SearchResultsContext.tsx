'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';

export type SearchFeatureProps = {
  id: string;
  name: string;
  category_id: string;
  priority: number | null;
  visited: boolean;
  tags: string;
  rank: number | null;
  distance_m: number | null;
};
export type SearchCollection = GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  SearchFeatureProps
>;

type SearchResultsValue = {
  isActive: boolean;
  collection: SearchCollection | null;
  loading: boolean;
  error: string | null;
};

const SearchResultsContext = createContext<SearchResultsValue | null>(null);

// Owns the single debounced fetch to /api/search, shared between MapView
// (pins) and SearchResultsList (the sidebar list) so typing doesn't trigger
// two independent network calls per keystroke.
export function SearchResultsProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const q = searchParams.get('q');
  const near = searchParams.get('near'); // "lat,lon"
  const radius = searchParams.get('radius'); // metres, plain number
  const cat = searchParams.get('cat');
  const visited = searchParams.get('visited');

  const isActive = Boolean(q?.trim()) || Boolean(near);

  const [collection, setCollection] = useState<SearchCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    // Nothing to fetch — the provider value below hides any stale
    // collection/error from a previous search while inactive, so state
    // doesn't need resetting here.
    if (!isActive) return;
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q?.trim()) params.set('q', q.trim());
      if (near) {
        const [lat, lon] = near.split(',');
        params.set('lat', lat);
        params.set('lon', lon);
        params.set('radius', `${radius ?? 50000}m`);
      }
      if (cat) params.set('cat', cat);
      if (visited) params.set('visited', visited);

      try {
        const res = await fetch(`/api/search?${params.toString()}`);
        if (requestId !== requestIdRef.current) return; // superseded
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? 'Search failed.');
        }
        setCollection((await res.json()) as SearchCollection);
        setError(null);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setCollection(null);
        setError(e instanceof Error ? e.message : 'Search failed.');
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 300); // same debounce as MapView's moveend and FilterPanel's useMatchCount
    return () => clearTimeout(timer);
  }, [isActive, q, near, radius, cat, visited]);

  return (
    <SearchResultsContext.Provider
      value={{
        isActive,
        collection: isActive ? collection : null,
        loading: isActive && loading,
        error: isActive ? error : null,
      }}
    >
      {children}
    </SearchResultsContext.Provider>
  );
}

export function useSearchResults() {
  const ctx = useContext(SearchResultsContext);
  if (!ctx) {
    throw new Error('useSearchResults must be used within a SearchResultsProvider');
  }
  return ctx;
}
