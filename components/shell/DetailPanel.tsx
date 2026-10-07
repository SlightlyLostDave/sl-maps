'use client';

import { useEffect, type ReactNode } from 'react';

import { useShell } from './ShellContext';

// Large detail panel floating over the bottom ⅔ of the map, spanning the
// map's full width (its left edge tracks whether the context panel is
// docked open). A stacked bottom sheet on mobile, above the context panel's
// own sheet. Positioned against the (app) layout's relative workspace
// container, which holds both the context panel and the map.
export default function DetailPanel({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  const { panelOpen } = useShell();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // onClose intentionally excluded — callers pass a fresh closure each
    // render, and re-subscribing on every render would be pure churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      className={`absolute inset-x-0 bottom-0 z-30 max-h-[85%] overflow-y-auto border-t border-line-strong bg-bg-raised shadow-(--shadow) md:right-0 md:h-2/3 md:max-h-none md:bg-bg-raised/95 md:backdrop-blur-sm ${
        panelOpen ? 'md:left-80' : 'md:left-0'
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        className="mx-auto mt-2.5 block h-1 w-8.5 rounded-full bg-line-strong md:hidden"
        aria-label="Close"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-5 hidden font-mono text-xs text-ink-faint hover:text-ink-dim md:block"
      >
        Close
      </button>
      <div className="p-4 pt-3.5 md:p-6">{children}</div>
    </section>
  );
}
