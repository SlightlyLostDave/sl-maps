'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  MapPinPlusIcon,
  Gps01Icon,
  Cancel01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';

const buttonClass =
  'grid h-11 w-11 md:h-8 md:w-8 place-items-center rounded-[4px] text-ink-dim hover:text-ink hover:border-crimson';

export default function AddPlacemarkToolbar({
  placing,
  onStartPlacing,
  onCancelPlacing,
  onConfirmPlacing,
  onUseLocation,
  locationError,
  isLocating,
}: {
  placing: boolean;
  onStartPlacing: () => void;
  onCancelPlacing: () => void;
  onConfirmPlacing: () => void;
  onUseLocation: () => void;
  locationError?: string | null;
  isLocating?: boolean;
}) {
  return (
    <div className="absolute right-[calc(0.75rem+env(safe-area-inset-right))] bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 flex flex-col items-end gap-2 md:right-3 md:top-23 md:bottom-auto">
      <div className="flex flex-col gap-1.5 rounded-md border border-line-strong bg-bg-raised p-1 shadow-(--shadow)">
        {!placing ? (
          <>
            <button
              type="button"
              onClick={onStartPlacing}
              aria-label="Add placemark"
              title="Add placemark"
              className={buttonClass}
            >
              <HugeiconsIcon
                icon={MapPinPlusIcon}
                size={16}
                strokeWidth={1.5}
              />
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
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onCancelPlacing}
              aria-label="Cancel"
              title="Cancel"
              className={buttonClass}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} />
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
            <button
              type="button"
              onClick={onConfirmPlacing}
              aria-label="Place here"
              title="Place here"
              className={`${buttonClass} bg-crimson text-on-crimson hover:text-on-crimson`}
            >
              <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
      {locationError && (
        <div className="max-w-50 rounded-md border border-crimson-deep bg-crimson-wash px-3 py-1.5 text-xs text-crimson-lift shadow-(--shadow)">
          {locationError}
        </div>
      )}
    </div>
  );
}
