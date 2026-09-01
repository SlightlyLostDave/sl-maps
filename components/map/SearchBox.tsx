'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Radar01Icon, Search01Icon } from '@hugeicons/core-free-icons';
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

type GeocodeSuggestion = { id: string; name: string; lat: number; lon: number };
type ResolvedLocation = { lat: number; lon: number; place?: string };

const GEOCODE_URL = 'https://api.mapbox.com/search/geocode/v6/forward';
// v6 forward geocoding's valid `types` values are country, region,
// postcode, district, place, locality, neighborhood, street, block,
// address, secondary_address — "poi" (used by the separate Search Box
// API) isn't one of them and makes the whole request 422.
const GEOCODE_TYPES = 'place,locality,neighborhood,district,region';

export default function SearchBox() {
  const {
    query,
    setQuery,
    near,
    setNear,
    clearNear,
    clearSearch,
    proximityEnabled,
    setProximityEnabled,
  } = useFilterParams();
  const { flyTo } = useMapControls();
  const [inputValue, setInputValue] = useState(query);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  // The last place we actually navigated to (typed coordinates, or a picked
  // suggestion) — kept around so switching the proximity toggle on can
  // start a proximity search immediately without the user retyping.
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(
    near ? { lat: near.lat, lon: near.lon } : null,
  );
  const requestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the input in sync when the query is cleared/changed elsewhere (e.g.
  // FilterPanel's "Clear all"). Adjusted during render rather than in an
  // effect, per https://react.dev/learn/you-might-not-need-an-effect
  // ("Adjusting some state when a prop changes") — refs can't be read
  // during render, so the "last seen" value is tracked in state instead.
  const [lastQuery, setLastQuery] = useState(query);
  if (query !== lastQuery) {
    setLastQuery(query);
    setInputValue(query);
    if (!query) {
      setSuggestions([]);
      setOpen(false);
      setResolvedLocation(null);
    }
  }

  function resetSearch() {
    setInputValue('');
    setSuggestions([]);
    setOpen(false);
    setResolvedLocation(null);
    clearSearch(); // clears q, near, radius, place — leaves the proximity toggle alone
  }

  // Coordinate parsing and the empty-input reset are synchronous reactions
  // to the user typing, not something that needs debouncing/an effect — do
  // them directly in the change handler so the effect below is left purely
  // for the debounced geocode fetch (a real external-system sync).
  function updateInput(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      resetSearch();
      return;
    }

    setInputValue(value);
    setOpen(true);

    const coords = parseCoordinates(trimmed);
    if (coords) {
      const [lon, lat] = coords;
      setSuggestions([]);
      setOpen(false);
      setResolvedLocation({ lat, lon });
      flyTo(coords, { zoom: 11 }); // always just navigate
      if (proximityEnabled) setNear(lat, lon);
      else clearNear();
    }
  }

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || parseCoordinates(trimmed)) return; // handled synchronously in updateInput

    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setQuery(trimmed); // runs the text/tag search against your own placemarks

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;
      try {
        const url = `${GEOCODE_URL}?q=${encodeURIComponent(trimmed)}&limit=6&types=${GEOCODE_TYPES}&access_token=${token}`;
        const res = await fetch(url);
        if (requestId !== requestIdRef.current) return;
        const data = await res.json();
        const features: GeocodeSuggestion[] = (data?.features ?? []).map(
          (f: {
            id?: string;
            properties?: { name?: string; full_address?: string; mapbox_id?: string };
            geometry: { coordinates: [number, number] };
          }, index: number) => {
            const [lon, lat] = f.geometry.coordinates;
            return {
              id: f.id ?? f.properties?.mapbox_id ?? String(index),
              name: f.properties?.name ?? f.properties?.full_address ?? trimmed,
              lat,
              lon,
            };
          },
        );
        setSuggestions(features);
      } catch {
        // Geocoding suggestions are a nice-to-have pivot, not required for
        // the text search itself — swallow network/parse errors silently.
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  // The dropdown is portaled to document.body (see below) so it can't be
  // clipped by an ancestor's overflow-y-auto — its position has to be
  // computed from the input's own screen rect instead of relying on normal
  // flow. Mirrors TagInput.tsx's identical dropdown-positioning pattern.
  useEffect(() => {
    if (!open) return;
    function updateRect() {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width });
    }
    updateRect();
    function onScroll() {
      setOpen(false);
    }
    window.addEventListener('scroll', onScroll, { capture: true });
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', updateRect);
    };
  }, [open]);

  function acceptSuggestion(s: GeocodeSuggestion) {
    setResolvedLocation({ lat: s.lat, lon: s.lon, place: s.name });
    flyTo([s.lon, s.lat], { zoom: 11 }); // always just navigate
    if (proximityEnabled) setNear(s.lat, s.lon, { place: s.name });
    setOpen(false);
  }

  function toggleProximity() {
    const next = !proximityEnabled;
    setProximityEnabled(next);
    if (next) {
      if (resolvedLocation) {
        setNear(
          resolvedLocation.lat,
          resolvedLocation.lon,
          resolvedLocation.place ? { place: resolvedLocation.place } : undefined,
        );
      }
    } else {
      clearNear();
    }
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
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => updateInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Search name, tag, place, or lat, lng…"
          className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-faint focus:outline-none"
        />
        {inputValue && (
          <button
            type="button"
            onClick={resetSearch}
            aria-label="Clear search"
            className="shrink-0 text-ink-faint hover:text-ink"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.5} />
          </button>
        )}
        <button
          type="button"
          onClick={toggleProximity}
          aria-pressed={proximityEnabled}
          aria-label="Search near this location"
          title="Also search my placemarks near this location"
          className={`flex shrink-0 items-center rounded-[4px] border p-1 transition-colors ${
            proximityEnabled
              ? 'border-crimson-deep bg-crimson-wash text-ink'
              : 'border-line text-ink-faint hover:text-ink'
          }`}
        >
          <HugeiconsIcon icon={Radar01Icon} size={14} strokeWidth={1.5} />
        </button>
      </div>
      {open &&
        suggestions.length > 0 &&
        dropdownRect &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: dropdownRect.top + 4,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
            className="z-50 overflow-hidden rounded-md border border-line-strong bg-bg-raised shadow-(--shadow)"
          >
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => acceptSuggestion(s)}
                className="block w-full truncate px-3 py-1.5 text-left text-sm text-ink-dim hover:bg-ground-2 hover:text-ink"
              >
                {s.name}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
