'use client';

import { useSearchParams } from 'next/navigation';

import ContextPanel from '@components/shell/ContextPanel';
import { useReviewQueue } from './ReviewQueueContext';

export default function ReviewList() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  const {
    items,
    loading,
    totalCount,
    reviewedCount,
    page,
    pageCount,
    nextPage,
    prevPage,
  } = useReviewQueue();

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', id);
    // See the shallow-routing note in MapView's point-click handler: this is
    // pure client state, so update the URL directly rather than via <Link>
    // (which is router.push() sugar and hits the same flakiness).
    window.history.pushState(null, '', `?${params.toString()}`);
  }

  const progress = totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0;

  return (
    <ContextPanel title="Review queue">
      <div className="flex shrink-0 flex-col gap-1.5">
        <p className="font-mono text-xs text-ink-faint">
          <span className="text-ink">{reviewedCount}</span> of {totalCount}{' '}
          reviewed
        </p>
        <div className="h-1 overflow-hidden rounded-full bg-ground-2">
          <div
            className="h-full rounded-full bg-patina"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {!loading && items.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-10 text-center">
          <h2 className="font-display text-xl text-ink">All caught up</h2>
          <p className="text-sm text-ink-faint">
            Nothing left in the review queue.
          </p>
        </div>
      ) : (
        <>
          {!selectedId && !loading && (
            <p className="text-sm text-ink-faint">
              Select a placemark to review it.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {items.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => select(item.id)}
                    className={`flex w-full flex-col gap-1 rounded-lg border bg-ground-2 px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'border-crimson text-ink'
                        : 'border-line text-ink-dim hover:border-line-strong hover:text-ink'
                    }`}
                  >
                    <span className="truncate text-sm font-medium">
                      {item.name}
                    </span>
                    <span className="font-mono text-[10px] text-ink-faint">
                      {item.categorySlug ?? 'uncategorized'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {pageCount > 1 && (
        <div className="flex shrink-0 items-center justify-between border-t border-line pt-3">
          <button
            type="button"
            onClick={prevPage}
            disabled={page === 0}
            className="rounded-md px-2 py-1 text-sm text-ink-dim transition-opacity hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <span className="font-mono text-xs text-ink-faint">
            Page {page + 1} of {pageCount}
          </span>
          <button
            type="button"
            onClick={nextPage}
            disabled={page >= pageCount - 1}
            className="rounded-md px-2 py-1 text-sm text-ink-dim transition-opacity hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </ContextPanel>
  );
}
