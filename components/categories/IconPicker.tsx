"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import iconNames from "@/lib/map/hugeiconsNames.json";

const MAX_SUGGESTIONS = 8;

export default function IconPicker({
  defaultValue,
  name = "icon",
}: {
  defaultValue?: string | null;
  name?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [resolved, setResolved] = useState<{ name: string; icon: IconSvgElement } | null>(null);
  const requestIdRef = useRef(0);

  const trimmed = value.trim();
  const isKnownName = (iconNames as string[]).includes(trimmed);
  const resolvedIcon = resolved?.name === trimmed ? resolved.icon : null;

  useEffect(() => {
    if (!isKnownName) return;
    const requestId = ++requestIdRef.current;
    fetch(`/hugeicons/${trimmed}.json`)
      .then((res) => res.json())
      .then((icon: IconSvgElement) => {
        if (requestId === requestIdRef.current) setResolved({ name: trimmed, icon });
      });
  }, [trimmed, isKnownName]);

  const suggestions = trimmed
    ? (iconNames as string[])
        .filter((n) => n.toLowerCase().includes(trimmed.toLowerCase()))
        .slice(0, MAX_SUGGESTIONS)
    : [];

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-dim">Icon</span>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-ground-2 text-ink-faint">
          {resolvedIcon ? (
            <HugeiconsIcon icon={resolvedIcon} size={18} />
          ) : trimmed ? (
            <span className="text-xs">?</span>
          ) : null}
        </div>
        <div className="relative flex-1">
          <input
            type="text"
            name={name}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder="e.g. Location01Icon"
            className="w-full rounded-md border border-line bg-ground-2 px-3 py-2 text-sm text-ink"
          />
          {open && suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line-strong bg-bg-raised shadow-(--shadow)">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setValue(suggestion);
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-ink-dim hover:bg-ground-2 hover:text-ink"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <span className="text-xs text-ink-faint">
        HugeIcons icon name — not yet used by map rendering.
      </span>
    </div>
  );
}
