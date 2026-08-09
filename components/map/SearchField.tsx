// Visual placeholder only. Full-text search (query param `q`, respecting
// active filters per sl-maps.html step 2.3) is not wired up yet.
export default function SearchField() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-ground-2 px-3 py-2 text-ink-faint">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="6.5" cy="6.5" r="4.5" />
        <line x1="10" y1="10" x2="14" y2="14" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        disabled
        placeholder="Search placemarks…"
        className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-faint focus:outline-none disabled:cursor-not-allowed"
      />
      <span className="shrink-0 rounded border border-line-strong px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
        Soon
      </span>
    </div>
  );
}
