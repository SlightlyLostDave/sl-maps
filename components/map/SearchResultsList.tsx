'use client';

import { useSearchParams } from 'next/navigation';
import { useSearchResults } from './SearchResultsContext';
import { useFilterParams } from './useFilterParams';

const RADIUS_PRESETS_KM = [10, 25, 50, 100, 250, 500];

export default function SearchResultsList() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  const { isActive, collection, loading, error } = useSearchResults();
  const { near, radiusM, place, setRadius, clearSearch } = useFilterParams();

  if (!isActive) return null;

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', id);
    // Same shallow-routing escape hatch as ReviewList.select() / MapView's
    // point-click handler — pure client state, router.push() is flaky here.
    window.history.pushState(null, '', `?${params.toString()}`);
  }

  const features = collection?.features ?? [];

  return (
    <div className="flex min-h-0 flex-col gap-2 border-t border-line pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="eyebrow">
          {near ? (
            <>
              Within{' '}
              <select
                value={radiusM}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="bg-transparent"
              >
                {RADIUS_PRESETS_KM.map((km) => (
                  <option key={km} value={km * 1000}>
                    {km} km
                  </option>
                ))}
              </select>{' '}
              of {place ?? `${near.lat.toFixed(2)}, ${near.lon.toFixed(2)}`}
            </>
          ) : (
            'Results'
          )}
        </h2>
        <button
          type="button"
          onClick={clearSearch}
          className="font-mono text-xs text-ink-faint hover:text-ink"
        >
          Clear
        </button>
      </div>

      {error && <p className="text-xs text-crimson-lift">{error}</p>}

      <ul className="flex flex-col gap-1 overflow-y-auto">
        {features.map((f) => {
          const isSelected = f.properties.id === selectedId;
          return (
            <li key={f.properties.id}>
              <button
                type="button"
                onClick={() => select(f.properties.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-ground-2 text-ink'
                    : 'text-ink-dim hover:bg-ground-2 hover:text-ink'
                }`}
              >
                <span className="truncate">{f.properties.name}</span>
                {f.properties.distance_m != null && (
                  <span className="shrink-0 font-mono text-xs text-ink-faint">
                    {(f.properties.distance_m / 1000).toFixed(1)} km
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {!loading && features.length === 0 && (
          <li className="px-2 py-1.5 text-sm text-ink-faint">No matches.</li>
        )}
      </ul>
    </div>
  );
}
