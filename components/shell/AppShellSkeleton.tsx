import Skeleton from '@components/ui/Skeleton';
import MapLoadingOverlay from '@components/map/MapLoadingOverlay';

// Suspense fallback for the whole (app) shell — shown until the
// useSearchParams-reading rail, panels and map can render.
export default function AppShellSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col-reverse md:flex-row">
      <div className="flex h-[calc(3.5rem+env(safe-area-inset-bottom))] shrink-0 items-start justify-around border-t border-line bg-bg-raised px-2 pt-2.5 md:h-full md:w-16 md:flex-col md:items-center md:justify-start md:gap-3 md:border-t-0 md:border-r md:px-0 md:pt-4">
        <Skeleton className="mb-10 hidden h-10 w-10 rounded-full md:block" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-9 rounded-full" />
        ))}
      </div>
      <div className="relative flex min-h-0 min-w-0 flex-1">
        <div className="hidden w-80 shrink-0 border-r border-line bg-bg-raised md:block">
          <PanelSkeletonBody />
        </div>
        <div className="relative min-w-0 flex-1">
          <MapLoadingOverlay />
        </div>
      </div>
    </div>
  );
}

function PanelSkeletonBody({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <Skeleton className="h-6 w-36" />
      <Skeleton className="h-9 w-full rounded-md" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
