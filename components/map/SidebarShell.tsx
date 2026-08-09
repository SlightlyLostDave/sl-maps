"use client";

import { useState, type ReactNode } from "react";
import { useFilterParams } from "./useFilterParams";

export default function SidebarShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { activeFilterCount } = useFilterParams();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-20 rounded-md border border-line-strong bg-bg-raised px-3 py-1.5 font-mono text-xs text-ink-dim shadow-(--shadow) md:hidden"
      >
        Filters{activeFilterCount > 0 && ` · ${activeFilterCount}`}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 min-h-0 shrink-0 flex-col gap-4 border-r border-line bg-bg-raised p-5 transition-transform duration-200 md:static md:z-auto md:h-full md:w-80 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between">
          <h2 className="eyebrow">Explore</h2>
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
