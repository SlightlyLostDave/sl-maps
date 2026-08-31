'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon } from '@hugeicons/core-free-icons';

export default function AppHeader({
  title,
  eyebrow,
  email,
  onSignOut,
  links,
}: {
  title: string;
  eyebrow?: string;
  email?: string | null;
  onSignOut?: () => Promise<void>;
  links: { href: string; label: string }[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative flex items-center justify-between border-b border-line px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="font-display text-2xl text-ink">{title}</h1>
      </div>

      <div className="hidden items-center gap-5 md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-ink-dim underline"
          >
            {link.label}
          </Link>
        ))}
        {onSignOut && (
          <form action={onSignOut} className="flex items-center gap-3">
            {email && <span className="text-sm text-ink">{email}</span>}
            <button type="submit" className="text-sm underline">
              Sign out
            </button>
          </form>
        )}
      </div>

      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={menuOpen}
        className="grid h-11 w-11 place-items-center rounded-md text-ink-dim hover:text-ink md:hidden"
      >
        <HugeiconsIcon icon={Menu01Icon} size={20} strokeWidth={1.5} />
      </button>

      {menuOpen && (
        <div
          className="absolute right-3 top-full z-20 mt-1 flex flex-col gap-3 rounded-md border border-line-strong bg-bg-raised p-4 shadow-(--shadow) md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-ink-dim underline"
            >
              {link.label}
            </Link>
          ))}
          {onSignOut && (
            <form
              action={onSignOut}
              className="flex flex-col items-start gap-2 border-t border-line pt-3"
            >
              {email && <span className="text-sm text-ink">{email}</span>}
              <button type="submit" className="text-sm underline">
                Sign out
              </button>
            </form>
          )}
        </div>
      )}
    </header>
  );
}
