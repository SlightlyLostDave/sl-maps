'use client';

import { useEffect, type ReactNode } from 'react';

// Bottom-sheet-on-mobile / static-side-panel-on-desktop shell, generalized
// from the pattern components/map/DetailDrawer.tsx originally hand-rolled.
export default function BottomSheet({
  open,
  onClose,
  widthClassName = 'md:w-105',
  children,
}: {
  open: boolean;
  onClose: () => void;
  widthClassName?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // onClose intentionally excluded — callers pass a fresh closure each
    // render, and re-subscribing on every render would be pure churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center md:static md:z-auto md:h-full md:shrink-0 md:items-stretch md:justify-end">
      <div
        className="absolute inset-0 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 max-h-[75vh] w-full overflow-y-auto rounded-t-xl border border-line-strong bg-bg-raised shadow-(--shadow) md:max-h-full md:h-full md:rounded-none md:border-y-0 md:border-r-0 md:border-l ${widthClassName}`}
      >
        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-2.5 block h-1 w-[34px] rounded-full bg-line-strong md:hidden"
          aria-label="Close"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 hidden font-mono text-xs text-ink-faint hover:text-ink-dim md:block"
        >
          Close
        </button>
        <div className="p-4 pt-3.5 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}
