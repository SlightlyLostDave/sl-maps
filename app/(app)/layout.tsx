import { Suspense } from 'react';

import { createClient } from '@lib/supabase/server';
import MapView from '@components/map/MapView';
import { FilterTransitionProvider } from '@components/map/FilterTransitionContext';
import { MapControlsProvider } from '@components/map/MapControlsContext';
import { SearchResultsProvider } from '@components/map/SearchResultsContext';
import AppRail from '@components/shell/AppRail';
import AppShellSkeleton from '@components/shell/AppShellSkeleton';
import { ShellProvider } from '@components/shell/ShellContext';

// Shared shell for every signed-in route: icon rail, the route's context
// panel + detail panel ({children}), and one persistent MapView. Layouts
// don't re-render on navigation, so the map survives switching between
// search/filters, the review queue and categories — route-aware behaviour
// lives in client components reading usePathname/useSearchParams.
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* The rail, panels and MapView all read URL state via
          useSearchParams, which requires a Suspense boundary for Next.js to
          allow the rest of the page to render without forcing full
          client-side rendering. */}
      <Suspense fallback={<AppShellSkeleton />}>
        <FilterTransitionProvider>
          <MapControlsProvider>
            <SearchResultsProvider>
              <ShellProvider>
                <div className="flex h-full min-h-0 flex-1 flex-col-reverse md:flex-row">
                  <AppRail email={user?.email} />
                  <div className="relative flex min-h-0 min-w-0 flex-1">
                    {children}
                    <div className="relative min-w-0 flex-1">
                      <MapView />
                    </div>
                  </div>
                </div>
              </ShellProvider>
            </SearchResultsProvider>
          </MapControlsProvider>
        </FilterTransitionProvider>
      </Suspense>
    </div>
  );
}
