'use client';

import { useEffect, useRef, useState } from 'react';

// Zoom a permalink opens at — close enough to pick out the placemark among
// its neighbours without losing the surrounding context.
const PERMALINK_ZOOM = 15;

// Copies a link that reopens this placemark on the map route. Includes the
// camera params MapView's parseInitialView reads on first load, since `?id=`
// alone opens the detail panel without moving the map to it.
export default function CopyPermalinkButton({
  placemarkId,
  lat,
  lon,
  className = 'text-[10px]',
}: {
  placemarkId: string;
  lat: number;
  lon: number;
  className?: string;
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  async function copy() {
    const params = new URLSearchParams({
      id: placemarkId,
      mlat: lat.toFixed(5),
      mlng: lon.toFixed(5),
      z: String(PERMALINK_ZOOM),
    });
    const url = `${window.location.origin}/?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus('idle'), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`font-mono tracking-widest text-ink-faint uppercase hover:text-ink ${className}`}
    >
      <span aria-live="polite">
        {status === 'copied'
          ? 'Copied'
          : status === 'failed'
            ? 'Copy failed'
            : 'Copy link'}
      </span>
    </button>
  );
}
