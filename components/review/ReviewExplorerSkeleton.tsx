import Skeleton from '@components/ui/Skeleton';
import MapLoadingOverlay from '@components/map/MapLoadingOverlay';

export default function ReviewExplorerSkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-line-strong shadow-(--shadow)">
      {/* ReviewList always shows its mobile toggle button, even before real
          data loads — match that instead of hiding the queue concept
          entirely on mobile (same fix as MapExplorerSkeleton). */}
      <div className="fixed left-[calc(0.75rem+env(safe-area-inset-left))] top-[calc(0.75rem+env(safe-area-inset-top))] z-20 md:hidden">
        <Skeleton className="h-7.5 w-24 rounded-md" />
      </div>
      <aside className="hidden w-80 shrink-0 flex-col gap-4 border-r border-line bg-bg-raised p-5 md:flex">
        <div>
          <Skeleton className="mb-1 h-3 w-24" />
          <Skeleton className="h-2.5 w-32" />
        </div>
        <div className="flex flex-col gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 px-2 py-1.5"
            >
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </aside>
      <div className="relative flex-1">
        <MapLoadingOverlay />
      </div>
      <aside className="hidden w-105 shrink-0 flex-col gap-4 border-l border-line bg-bg-raised p-6 md:flex">
        <Skeleton className="h-3 w-20" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </aside>
    </div>
  );
}
