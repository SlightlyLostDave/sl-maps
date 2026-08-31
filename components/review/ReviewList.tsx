'use client';

import { useSearchParams } from 'next/navigation';
import { useReviewQueue } from './ReviewQueueContext';

export default function ReviewList() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  const { items, loading, totalCount, reviewedCount } = useReviewQueue();

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', id);
    // See the shallow-routing note in MapView's point-click handler: this is
    // pure client state, so update the URL directly rather than via <Link>
    // (which is router.push() sugar and hits the same flakiness).
    window.history.pushState(null, '', `?${params.toString()}`);
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-bg-raised p-5">
      <div>
        <h2 className="eyebrow mb-1">Review queue</h2>
        <p className="text-xs text-ink-faint">
          {reviewedCount} of {totalCount} reviewed
        </p>
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => select(item.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-ground-2 text-ink'
                    : 'text-ink-dim hover:bg-ground-2 hover:text-ink'
                }`}
              >
                <span className="truncate">{item.name}</span>
                <span className="shrink-0 font-mono text-xs text-ink-faint">
                  {item.categorySlug ?? 'uncategorized'}
                </span>
              </button>
            </li>
          );
        })}
        {!loading && items.length === 0 && (
          <li className="px-2 py-1.5 text-sm text-ink-faint">
            Nothing left to review.
          </li>
        )}
      </ul>
    </aside>
  );
}
