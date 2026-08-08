import Spinner from "@/components/ui/Spinner";

export default function MapLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-ground-1">
      <div className="flex flex-col items-center gap-2 text-ink-faint">
        <Spinner size="lg" />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]">Loading map…</span>
      </div>
    </div>
  );
}
