"use client";

import { useFilterParams, type VisitedStatus } from "./useFilterParams";

function pillClass(active: boolean) {
  return `rounded-md border px-3 py-1.5 text-xs font-mono transition-colors ${
    active
      ? "border-crimson bg-crimson-wash text-ink"
      : "border-line-strong text-ink-dim hover:text-ink"
  }`;
}

const SEGMENTS: { status: VisitedStatus; label: string }[] = [
  { status: "all", label: "All" },
  { status: "visited", label: "Visited" },
  { status: "not_visited", label: "Not visited" },
];

export default function StatusFilter({
  visitedCount,
  notVisitedCount,
  wantToGoCount,
}: {
  visitedCount: number;
  notVisitedCount: number;
  wantToGoCount: number;
}) {
  const { visitedStatus, wantToGoOn, setVisited, toggleWantToGo } = useFilterParams();

  const countFor = (status: VisitedStatus) => {
    if (status === "visited") return visitedCount;
    if (status === "not_visited") return notVisitedCount;
    return null;
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="eyebrow">Status</h3>
      <div
        role="group"
        aria-label="Visited status"
        className="flex divide-x divide-line-strong overflow-hidden rounded-md border border-line-strong"
      >
        {SEGMENTS.map(({ status, label }) => {
          const active = visitedStatus === status;
          const count = countFor(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => setVisited(status)}
              aria-pressed={active}
              className={`flex-1 px-2 py-1.5 text-xs font-mono transition-colors ${
                active ? "bg-crimson-wash text-ink" : "text-ink-dim hover:text-ink"
              }`}
            >
              {label}
              {count !== null && <span className="text-ink-faint"> ({count})</span>}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleWantToGo}
          aria-pressed={wantToGoOn}
          className={pillClass(wantToGoOn)}
        >
          Want to go <span className="text-ink-faint">({wantToGoCount})</span>
        </button>
      </div>
    </div>
  );
}
