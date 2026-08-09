"use client";

export default function AddPlacemarkToolbar({
  addMode,
  onToggleAddMode,
  onUseLocation,
  locationError,
}: {
  addMode: boolean;
  onToggleAddMode: () => void;
  onUseLocation: () => void;
  locationError?: string | null;
}) {
  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
      <div className="flex gap-1.5 rounded-md border border-line-strong bg-bg-raised p-1 shadow-(--shadow)">
        <button
          type="button"
          onClick={onToggleAddMode}
          aria-pressed={addMode}
          className={`rounded-[4px] px-3 py-1.5 font-mono text-xs transition-colors ${
            addMode ? "bg-crimson text-on-crimson" : "text-ink-dim hover:text-ink"
          }`}
        >
          {addMode ? "Click the map…" : "+ Add placemark"}
        </button>
        <button
          type="button"
          onClick={onUseLocation}
          className="rounded-[4px] px-3 py-1.5 font-mono text-xs text-ink-dim hover:text-ink"
        >
          Use my location
        </button>
      </div>
      {locationError && (
        <div className="rounded-md border border-crimson-deep bg-crimson-wash px-3 py-1.5 text-xs text-crimson-lift shadow-(--shadow)">
          {locationError}
        </div>
      )}
    </div>
  );
}
