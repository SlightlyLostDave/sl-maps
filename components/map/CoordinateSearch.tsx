"use client";

import { useState, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { useMapControls } from "./MapControlsContext";

function parseCoordinates(input: string): [number, number] | null {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lng, lat];
}

export default function CoordinateSearch() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { flyTo } = useMapControls();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseCoordinates(value);
    if (!parsed) {
      setError("Enter coordinates as lat, lng — e.g. 43.6532, -79.3832");
      return;
    }
    setError(null);
    flyTo(parsed, { zoom: 14 });
  }

  return (
    <div className="shrink-0">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-md border border-line bg-ground-2 px-3 py-2"
      >
        <HugeiconsIcon icon={Search01Icon} size={14} className="shrink-0 text-ink-faint" strokeWidth={1.5} />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="Lat, lng (decimal degrees)"
          className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-faint focus:outline-none"
        />
      </form>
      {error && (
        <p className="mt-1.5 rounded-md border border-crimson-deep bg-crimson-wash px-3 py-1.5 text-xs text-crimson-lift">
          {error}
        </p>
      )}
    </div>
  );
}
