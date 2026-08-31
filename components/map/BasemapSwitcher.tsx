'use client';

import { HugeiconsIcon } from '@hugeicons/react';

import { BASEMAPS, otherBasemapId, type BasemapId } from '@lib/map/basemaps';

const buttonClass =
  'grid h-11 w-11 md:h-8 md:w-8 place-items-center rounded-[4px] text-ink-dim hover:text-ink hover:border-crimson';

export default function BasemapSwitcher({
  activeBasemapId,
  onToggle,
}: {
  activeBasemapId: BasemapId;
  onToggle: () => void;
}) {
  const target = BASEMAPS[otherBasemapId(activeBasemapId)];

  return (
    <div className="absolute left-[calc(0.75rem+env(safe-area-inset-left))] bottom-[calc(2.5rem+env(safe-area-inset-bottom))] z-10 md:left-auto md:right-3 md:bottom-3">
      {/* Mobile: bottom-left, raised above the AttributionControl strip that
          also docks bottom-left. Desktop: unchanged bottom-right, clear of
          the AddPlacemarkToolbar's top-right cluster. */}
      <div className="flex flex-col gap-1.5 rounded-md border border-line-strong bg-bg-raised p-1 shadow-(--shadow)">
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Switch to ${target.label}`}
          title={`Switch to ${target.label}`}
          className={buttonClass}
        >
          <HugeiconsIcon icon={target.icon} size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
