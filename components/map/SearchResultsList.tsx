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

  if (!isActive) {
    return (
      <p className="text-sm text-ink-faint">
        Search your placemarks by name or tag, jump to a place, or paste
        coordinates.
      </p>
    );
  }

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', id);
    // Same shallow-routing escape hatch as ReviewList.select() / MapView's
    // point-click handler — pure client state, router.push() is flaky here.
    window.history.pushState(null, '', `?${params.toString()}`);
  }

  const features = collection?.features ?? [];

  return (
    <div className="flex min-h-0 flex-col gap-3">
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
            'Your placemarks'
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

      <ul className="flex flex-col gap-2">
        {features.map((f) => {
          const isSelected = f.properties.id === selectedId;
          return (
            <li key={f.properties.id}>
              <button
                type="button"
                onClick={() => select(f.properties.id)}
                className={`flex w-full flex-col gap-1 rounded-lg border bg-ground-2 px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border-crimson text-ink'
                    : 'border-line text-ink-dim hover:border-line-strong hover:text-ink'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {f.properties.name}
                  </span>
                  {f.properties.visited && (
                    <span className="shrink-0 rounded-full bg-patina-wash px-2 py-0.5 font-mono text-[9px] text-patina">
                      Visited
                    </span>
                  )}
                </span>
                {(f.properties.tags || f.properties.distance_m != null) && (
                  <span className="flex items-center justify-between gap-2 font-mono text-[10px] text-ink-faint">
                    <span className="truncate">{f.properties.tags}</span>
                    {f.properties.distance_m != null && (
                      <span className="shrink-0">
                        {(f.properties.distance_m / 1000).toFixed(1)} km
                      </span>
                    )}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {features.length === 0 && (
          <li className="py-1.5 text-sm text-ink-faint">
            {loading ? 'Searching…' : 'No matches.'}
          </li>
        )}
      </ul>
    </div>
  );
}
