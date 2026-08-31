'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { BASEMAPS, otherBasemapId, type BasemapId } from '@lib/map/basemaps';

const buttonClass =
  'grid h-8 w-8 place-items-center rounded-[4px] text-ink-dim hover:text-ink hover:border-crimson';

export default function BasemapSwitcher({
  activeBasemapId,
  onToggle,
}: {
  activeBasemapId: BasemapId;
  onToggle: () => void;
}) {
  const target = BASEMAPS[otherBasemapId(activeBasemapId)];

  return (
    <div className="absolute right-3 bottom-3 z-10">
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
