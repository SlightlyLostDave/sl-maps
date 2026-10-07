'use client';

import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import DetailPanel from '@components/shell/DetailPanel';
import { useCategoryTransition } from './CategoryTransitionContext';

// Client wrapper so the server-rendered CategoryDetail can sit in the
// shell's DetailPanel. Closing is a real navigation back to /categories
// (the page is server-rendered from searchParams), run through the same
// transition CategoryNavLink uses so the loading overlay shows.
export default function CategoryDetailPanel({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { startTransition } = useCategoryTransition();

  return (
    <DetailPanel
      onClose={() => startTransition(() => router.push('/categories'))}
    >
      {children}
    </DetailPanel>
  );
}
