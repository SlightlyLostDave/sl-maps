'use client';

import { type ReactNode } from 'react';

import { useFilterParams } from './useFilterParams';
import DrawerShell from '@components/ui/DrawerShell';

export default function SidebarShell({ children }: { children: ReactNode }) {
  const { activeFilterCount } = useFilterParams();

  return (
    <DrawerShell
      title="Explore"
      toggleLabel={
        <>Filters{activeFilterCount > 0 && ` · ${activeFilterCount}`}</>
      }
      widthClassName="w-72 md:w-80"
    >
      {children}
    </DrawerShell>
  );
}
