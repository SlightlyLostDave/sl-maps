'use client';

import { type ReactNode } from 'react';

import ContextPanel from '@components/shell/ContextPanel';
import { useShell } from '@components/shell/ShellContext';

export default function MapPanelSwitcher({
  search,
  filters,
}: {
  search: ReactNode;
  filters: ReactNode;
}) {
  const { activeContext } = useShell();

  return activeContext === 'filters' ? (
    <ContextPanel title="Filters">{filters}</ContextPanel>
  ) : (
    <ContextPanel title="Search">{search}</ContextPanel>
  );
}
