import { Suspense } from "react";
import MapView from "@/components/map/MapView";
import Sidebar from "@/components/map/Sidebar";
import DetailDrawer from "@/components/map/DetailDrawer";
import MapExplorerSkeleton from "@/components/map/MapExplorerSkeleton";
import { FilterTransitionProvider } from "@/components/map/FilterTransitionContext";

export default function MapExplorer() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-line-strong shadow-(--shadow)">
      {/* Sidebar, MapView and DetailDrawer all read filter/selection state
          from the URL via useSearchParams, which requires a Suspense
          boundary for Next.js to allow the rest of the page to render
          without forcing full client-side rendering. */}
      <Suspense fallback={<MapExplorerSkeleton />}>
        <FilterTransitionProvider>
          <Sidebar />
          <div className="flex min-w-0 flex-1">
            <div className="relative min-w-0 flex-1">
              <MapView />
            </div>
            <DetailDrawer />
          </div>
        </FilterTransitionProvider>
      </Suspense>
    </div>
  );
}
