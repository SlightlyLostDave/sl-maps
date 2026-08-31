'use client';

import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { useMapControls } from './MapControlsContext';
import { useFilterParams } from './useFilterParams';

function parseCoordinates(input: string): [number, number] | null {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lng, lat];
}

type GeocodeSuggestion = { name: string; lat: number; lon: number };

const GEOCODE_URL = 'https://api.mapbox.com/search/geocode/v6/forward';
// v6 forward geocoding's valid `types` values are country, region,
// postcode, district, place, locality, neighborhood, street, block,
// address, secondary_address — "poi" (used by the separate Search Box
// API) isn't one of them and makes the whole request 422.
const GEOCODE_TYPES = 'place,locality,neighborhood,district,region';

export default function SearchBox() {
  const { query, setQuery, setNear } = useFilterParams();
  const { flyTo } = useMapControls();
  const [inputValue, setInputValue] = useState(query);
  const [suggestion, setSuggestion] = useState<GeocodeSuggestion | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const requestIdRef = useRef(0);

  // Keep the input in sync when the query is cleared/changed elsewhere (e.g.
  // FilterPanel's "Clear all"). Adjusted during render rather than in an
  // effect, per https://react.dev/learn/you-might-not-need-an-effect
  // ("Adjusting some state when a prop changes") — refs can't be read
  // during render, so the "last seen" value is tracked in state instead.
  const [lastQuery, setLastQuery] = useState(query);
  if (query !== lastQuery) {
    setLastQuery(query);
    setInputValue(query);
  }

  function updateInput(value: string) {
    setInputValue(value);
    setDismissed(false);
    setSuggestion(null);
  }

  useEffect(() => {
    const trimmed = inputValue.trim();

    if (!trimmed) {
      setQuery('');
      return;
    }

    const coords = parseCoordinates(trimmed);
    if (coords) {
      const [lon, lat] = coords;
      setNear(lat, lon);
      flyTo(coords, { zoom: 11 });
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setQuery(trimmed); // runs the text/tag search immediately

      // In parallel: try to resolve the same text as a place name. The
      // Mapbox token is already public/client-exposed (see MapView.tsx),
      // so this can be called directly from the browser without a server
      // proxy.
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;
      try {
        const url = `${GEOCODE_URL}?q=${encodeURIComponent(trimmed)}&limit=1&types=${GEOCODE_TYPES}&access_token=${token}`;
        const res = await fetch(url);
        if (requestId !== requestIdRef.current) return;
        const data = await res.json();
        const feature = data?.features?.[0];
        // v6's match_code/confidence is populated mainly for address-type
        // results (Smart Address Match) — place/region/poi results commonly
        // omit it entirely. Treat a present-but-low/medium confidence as a
        // reject, and a missing match_code as an accept, since limit=1 plus
        // the restricted `types` list above already did most of the
        // filtering.
        const confidence = feature?.properties?.match_code?.confidence;
        const rejected = confidence === 'low' || confidence === 'medium';
        if (feature && !rejected) {
          const [lon, lat] = feature.geometry.coordinates;
          setSuggestion({
            name:
              feature.properties?.name ??
              feature.properties?.full_address ??
              trimmed,
            lat,
            lon,
          });
        }
      } catch {
        // Geocoding is a nice-to-have pivot suggestion, not required for
        // the text search itself — swallow network/parse errors silently.
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  function acceptSuggestion() {
    if (!suggestion) return;
    setNear(suggestion.lat, suggestion.lon, { place: suggestion.name });
    flyTo([suggestion.lon, suggestion.lat], { zoom: 11 });
    setSuggestion(null);
  }

  return (
    <div className="shrink-0 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-md border border-line bg-ground-2 px-3 py-2">
        <HugeiconsIcon
          icon={Search01Icon}
          size={14}
          className="shrink-0 text-ink-faint"
          strokeWidth={1.5}
        />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => updateInput(e.target.value)}
          placeholder="Search name, tag, place, or lat, lng…"
          className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-faint focus:outline-none"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => updateInput('')}
            aria-label="Clear search"
            className="shrink-0 text-ink-faint hover:text-ink"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>
      {suggestion && !dismissed && (
        <button
          type="button"
          onClick={acceptSuggestion}
          className="flex items-center justify-between gap-2 rounded-md border border-line-strong bg-bg-raised px-3 py-1.5 text-left text-xs text-ink-dim hover:text-ink"
        >
          <span className="truncate">Near {suggestion.name} — search nearby</span>
          <span
            role="button"
            aria-label="Dismiss suggestion"
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            className="shrink-0 text-ink-faint hover:text-crimson-lift"
          >
            ×
          </span>
        </button>
      )}
    </div>
  );
}
