import Skeleton from '@/components/ui/Skeleton';
import MapLoadingOverlay from './MapLoadingOverlay';

export default function MapExplorerSkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-line-strong shadow-(--shadow)">
      {/* SidebarShell always shows its mobile toggle button, even before
          real data loads — this placeholder matches that instead of just
          hiding the sidebar concept entirely on mobile. */}
      <div className="fixed left-[calc(0.75rem+env(safe-area-inset-left))] top-[calc(0.75rem+env(safe-area-inset-top))] z-20 md:hidden">
        <Skeleton className="h-7.5 w-24 rounded-md" />
      </div>
      <aside className="hidden w-80 shrink-0 flex-col gap-4 border-r border-line bg-bg-raised p-5 md:flex">
        <Skeleton className="h-3 w-16" />
        <div className="flex flex-col gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 px-2 py-1.5"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-5" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-line pt-3">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
      </aside>
      <div className="relative flex-1">
        <MapLoadingOverlay />
      </div>
    </div>
  );
}
