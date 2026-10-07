'use client';

import { type ReactNode } from 'react';

import { useShell } from './ShellContext';

// The scrolling list panel between the icon rail and the map. Docked
// in-flow on desktop (so the map's ResizeObserver picks up collapse/expand);
// a sheet over the map on mobile. Open state comes from ShellContext so the
// rail can toggle it.
export default function ContextPanel({
  title,
  actions,
  children,
}: {
  title: ReactNode;
  /** Header-right slot, e.g. "+ New category" or "Clear all". */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { panelOpen, sheetOpen, setSheetOpen } = useShell();

  return (
    <aside
      className={`${sheetOpen ? 'flex' : 'hidden'} ${
        panelOpen ? 'md:flex' : 'md:hidden'
      } absolute inset-x-0 bottom-0 z-20 max-h-[70%] min-h-0 flex-col border-t border-line-strong bg-bg-raised shadow-(--shadow) md:relative md:inset-auto md:z-auto md:h-full md:max-h-none md:w-80 md:shrink-0 md:rounded-none md:border-t-0 md:border-r md:border-line md:shadow-none`}
    >
      <button
        type="button"
        onClick={() => setSheetOpen(false)}
        className="mx-auto mt-2.5 block h-1 w-8.5 shrink-0 rounded-full bg-line-strong md:hidden"
        aria-label="Close panel"
      />
      <header className="flex shrink-0 items-center justify-between gap-3 px-5 pt-3 pb-3 md:pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <h1 className="font-display text-2xl text-ink">{title}</h1>
        {actions}
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5">
        {children}
      </div>
    </aside>
  );
}
