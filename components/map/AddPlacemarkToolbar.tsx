'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { MapPinPlusIcon, Gps01Icon } from '@hugeicons/core-free-icons';

const buttonClass =
  'grid h-8 w-8 place-items-center rounded-[4px] text-ink-dim hover:text-ink hover:border-crimson';

export default function AddPlacemarkToolbar({
  addMode,
  onToggleAddMode,
  onUseLocation,
  locationError,
  isLocating,
}: {
  addMode: boolean;
  onToggleAddMode: () => void;
  onUseLocation: () => void;
  locationError?: string | null;
  isLocating?: boolean;
}) {
  return (
    <div className="absolute right-3 top-23 z-10 flex flex-col items-end gap-2">
      <div className="flex flex-col gap-1.5 rounded-md border border-line-strong bg-bg-raised p-1 shadow-(--shadow)">
        <button
          type="button"
          onClick={onToggleAddMode}
          aria-pressed={addMode}
          aria-label={addMode ? 'Click the map to place it' : 'Add placemark'}
          title={addMode ? 'Click the map to place it' : 'Add placemark'}
          className={`${buttonClass} ${addMode ? 'bg-crimson text-on-crimson' : ''}`}
        >
          <HugeiconsIcon icon={MapPinPlusIcon} size={16} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={onUseLocation}
          disabled={isLocating}
          aria-label="Use my location"
          title="Use my location"
          className={buttonClass}
        >
          <HugeiconsIcon icon={Gps01Icon} size={16} strokeWidth={1.5} />
        </button>
      </div>
      {locationError && (
        <div className="max-w-50 rounded-md border border-crimson-deep bg-crimson-wash px-3 py-1.5 text-xs text-crimson-lift shadow-(--shadow)">
          {locationError}
        </div>
      )}
    </div>
  );
}
