'use client';

import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  CheckListIcon,
  FilterHorizontalIcon,
  Folder01Icon,
  Logout01Icon,
  MapsIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';

import { signOut } from '@app/actions/auth';
import { useFilterParams } from '@components/map/useFilterParams';
import { useShell, type ShellContextId } from './ShellContext';

const ITEMS: { id: ShellContextId; label: string; icon: IconSvgElement }[] = [
  { id: 'search', label: 'Search', icon: Search01Icon },
  { id: 'filters', label: 'Filters', icon: FilterHorizontalIcon },
  { id: 'review', label: 'Review queue', icon: CheckListIcon },
  { id: 'categories', label: 'Categories', icon: Folder01Icon },
];

const buttonClass =
  'relative grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors';

// Docked full-height icon rail on desktop; a bottom tab bar on mobile (the
// (app) layout's flex-col-reverse is what puts it at the bottom there).
export default function AppRail({ email }: { email?: string | null }) {
  const { activeContext, panelOpen, sheetOpen, selectContext } = useShell();
  const { activeFilterCount } = useFilterParams();

  return (
    <nav
      aria-label="Main"
      className="z-40 flex h-[calc(3.5rem+env(safe-area-inset-bottom))] shrink-0 items-start justify-around border-t border-line bg-bg-raised px-2 pt-1.5 pb-[env(safe-area-inset-bottom)] md:h-full md:w-16 md:flex-col md:items-center md:justify-start md:border-t-0 md:border-r md:px-0 md:pt-[calc(1rem+env(safe-area-inset-top))] md:pb-4"
    >
      <div
        className="mb-10 hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-crimson text-on-crimson md:grid"
        title="SL Maps"
      >
        <HugeiconsIcon icon={MapsIcon} size={20} strokeWidth={1.5} />
      </div>

      <div className="flex flex-1 items-start justify-around md:flex-none md:flex-col md:gap-3">
        {ITEMS.map((item) => {
          const isActive = item.id === activeContext;
          // Highlight only while the panel is actually showing — a
          // collapsed panel shouldn't look "selected". The md: variants keep
          // desktop and mobile in step with their own open flag.
          const desktopOn = isActive && panelOpen;
          const mobileOn = isActive && sheetOpen;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectContext(item.id)}
              aria-label={item.label}
              aria-pressed={isActive}
              title={item.label}
              className={`${buttonClass} ${
                mobileOn
                  ? 'bg-crimson text-on-crimson'
                  : isActive
                    ? 'text-ink'
                    : 'text-ink-dim hover:text-ink'
              } ${
                desktopOn
                  ? 'md:bg-crimson md:text-on-crimson'
                  : isActive
                    ? 'md:bg-transparent md:text-ink'
                    : 'md:bg-transparent md:text-ink-dim md:hover:text-ink'
              }`}
            >
              <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.5} />
              {item.id === 'filters' && activeFilterCount > 0 && (
                <span className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-patina px-1 font-mono text-[9px] text-(--ground-0)">
                  {activeFilterCount}
                </span>
              )}
            </button>
          );
        })}

        <form action={signOut} className="md:hidden">
          <button
            type="submit"
            aria-label="Sign out"
            title={email ? `Sign out ${email}` : 'Sign out'}
            className={`${buttonClass} text-ink-dim hover:text-ink`}
          >
            <HugeiconsIcon icon={Logout01Icon} size={20} strokeWidth={1.5} />
          </button>
        </form>
      </div>

      <form action={signOut} className="mt-auto hidden md:block">
        <button
          type="submit"
          aria-label="Sign out"
          title={email ? `Sign out ${email}` : 'Sign out'}
          className={`${buttonClass} text-ink-dim hover:text-ink`}
        >
          <HugeiconsIcon icon={Logout01Icon} size={20} strokeWidth={1.5} />
        </button>
      </form>
    </nav>
  );
}
