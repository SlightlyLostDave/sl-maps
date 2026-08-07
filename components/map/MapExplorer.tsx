import MapView from "@/components/map/MapView";
import Sidebar from "@/components/map/Sidebar";

export default function MapExplorer() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-line-strong shadow-(--shadow)">
      <Sidebar />
      <div className="relative flex-1">
        <MapView />
      </div>
    </div>
  );
}
