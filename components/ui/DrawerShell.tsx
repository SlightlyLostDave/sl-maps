'use client';

import { useState, type ReactNode } from 'react';

// Off-canvas-on-mobile / static-column-on-desktop shell, generalized from
// the pattern components/map/SidebarShell.tsx originally hand-rolled.
// Uncontrolled (internal state) when open/onOpenChange aren't passed, so
// SidebarShell's own behavior is unchanged; controlled when they are, so a
// consumer like ReviewList can keep the "is it open" boolean in its own
// shared state (e.g. ReviewQueueContext).
export default function DrawerShell({
  title,
  toggleLabel,
  widthClassName = 'w-72 md:w-80',
  open: openProp,
  onOpenChange,
  children,
}: {
  /** Heading shown inside the drawer itself. */
  title: ReactNode;
  /** Label on the fixed toggle button that opens the drawer on mobile. */
  toggleLabel: ReactNode;
  widthClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-[calc(0.75rem+env(safe-area-inset-left))] top-[calc(0.75rem+env(safe-area-inset-top))] z-20 rounded-md border border-line-strong bg-bg-raised px-3 py-1.5 font-mono text-xs text-ink-dim shadow-(--shadow) md:hidden"
      >
        {toggleLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex min-h-0 shrink-0 overflow-auto flex-col gap-4 border-r border-line bg-bg-raised p-5 transition-transform duration-200 md:static md:z-auto md:h-full md:translate-x-0 ${widthClassName} ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between">
          <h2 className="eyebrow">{title}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="font-mono text-xs text-ink-faint md:hidden"
          >
            Close
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}
