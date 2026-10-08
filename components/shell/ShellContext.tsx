'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  contextFromLocation,
  type ShellContextId,
} from '@lib/url/shellContext';

export type { ShellContextId };

// Params that belong to the map route's own state (filters, search, the
// search/filters panel choice). Saved when leaving `/` so returning via the
// rail restores them instead of dropping the user's filters.
const MAP_ROUTE_PARAMS = [
  'panel',
  'cat',
  'visited',
  'q',
  'near',
  'radius',
  'place',
  'proximity',
];

const DESKTOP_QUERY = '(min-width: 768px)';

type ShellValue = {
  activeContext: ShellContextId;
  /** Desktop: is the context panel docked open beside the rail. */
  panelOpen: boolean;
  /** Mobile: is the context panel's sheet open over the map. */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  selectContext: (ctx: ShellContextId) => void;
};

const ShellContext = createContext<ShellValue | null>(null);

// Owns the icon rail's "which context is showing, and is its panel open"
// state. Mirrors MapControlsContext's provider pattern — lives in the (app)
// layout so it survives route changes, same as the map itself. Desktop and
// mobile keep separate open flags so neither breakpoint flashes the wrong
// state during SSR (the panel defaults open on desktop, closed on mobile).
export function ShellProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeContext = contextFromLocation(
    pathname,
    searchParams.get('panel'),
  );

  const [panelOpen, setPanelOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const mapQueryRef = useRef('');

  useEffect(() => {
    if (pathname !== '/') return;
    const saved = new URLSearchParams();
    for (const key of MAP_ROUTE_PARAMS) {
      const value = searchParams.get(key);
      if (value != null) saved.set(key, value);
    }
    mapQueryRef.current = saved.toString();
  }, [pathname, searchParams]);

  function open() {
    setPanelOpen(true);
    setSheetOpen(true);
  }

  function selectContext(ctx: ShellContextId) {
    if (ctx === activeContext) {
      if (window.matchMedia(DESKTOP_QUERY).matches) setPanelOpen((v) => !v);
      else setSheetOpen((v) => !v);
      return;
    }

    open();

    if (ctx === 'review' || ctx === 'categories') {
      router.push(`/${ctx}`);
      return;
    }

    if (pathname === '/') {
      // Search ↔ Filters on the map route is pure client state — same
      // shallow-routing escape hatch as useFilterParams.updateParams (see
      // MapView's point-click handler for why router.push() is flaky here).
      const params = new URLSearchParams(searchParams.toString());
      if (ctx === 'filters') params.set('panel', 'filters');
      else params.delete('panel');
      const query = params.toString();
      window.history.pushState(null, '', query ? `?${query}` : '?');
      return;
    }

    const params = new URLSearchParams(mapQueryRef.current);
    if (ctx === 'filters') params.set('panel', 'filters');
    else params.delete('panel');
    const query = params.toString();
    router.push(query ? `/?${query}` : '/');
  }

  return (
    <ShellContext.Provider
      value={{
        activeContext,
        panelOpen,
        sheetOpen,
        setSheetOpen,
        selectContext,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) throw new Error('useShell must be used within a ShellProvider');
  return context;
}
