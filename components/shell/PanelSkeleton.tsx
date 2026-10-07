'use client';

import Skeleton from '@components/ui/Skeleton';
import ContextPanel from './ContextPanel';

// Route-level loading.tsx fallback: only the context panel is replaced
// while a route's server data loads — the rail and map persist in the
// (app) layout.
export default function PanelSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <ContextPanel title={<Skeleton className="h-6 w-36" />}>
      <Skeleton className="h-9 w-full shrink-0 rounded-md" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </ContextPanel>
  );
}
