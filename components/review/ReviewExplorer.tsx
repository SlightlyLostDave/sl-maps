import { Suspense } from 'react';
import MapView from '@components/map/MapView';
import { FilterTransitionProvider } from '@components/map/FilterTransitionContext';
import { MapControlsProvider } from '@components/map/MapControlsContext';
import { SearchResultsProvider } from '@components/map/SearchResultsContext';
import ReviewList from './ReviewList';
import ReviewDetailPanel from './ReviewDetailPanel';
import { ReviewQueueProvider } from './ReviewQueueContext';
import ReviewExplorerSkeleton from './ReviewExplorerSkeleton';

export default function ReviewExplorer() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-line-strong shadow-(--shadow)">
      {/* ReviewList, MapView and ReviewDetailPanel all read selection state
          from the URL via useSearchParams, which requires a Suspense
          boundary for Next.js to allow the rest of the page to render
          without forcing full client-side rendering. */}
      <Suspense fallback={<ReviewExplorerSkeleton />}>
        <FilterTransitionProvider>
          <MapControlsProvider>
            <SearchResultsProvider>
              <ReviewQueueProvider>
                <ReviewList />
                <div className="flex min-w-0 flex-1">
                  <div className="relative min-w-0 flex-1">
                    <MapView />
                  </div>
                  <ReviewDetailPanel />
                </div>
              </ReviewQueueProvider>
            </SearchResultsProvider>
          </MapControlsProvider>
        </FilterTransitionProvider>
      </Suspense>
    </div>
  );
}
