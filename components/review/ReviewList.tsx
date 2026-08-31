'use client';

import { useSearchParams } from 'next/navigation';

import DrawerShell from '@components/ui/DrawerShell';
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
    listOpen,
    setListOpen,
  } = useReviewQueue();

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', id);
    // See the shallow-routing note in MapView's point-click handler: this is
    // pure client state, so update the URL directly rather than via <Link>
    // (which is router.push() sugar and hits the same flakiness).
    window.history.pushState(null, '', `?${params.toString()}`);
    setListOpen(false);
  }

  return (
    <DrawerShell
      title="Review queue"
      toggleLabel={
        <>
          Queue · {reviewedCount}/{totalCount}
        </>
      }
      widthClassName="w-72 md:w-80"
      open={listOpen}
      onOpenChange={setListOpen}
    >
      <p className="text-xs text-ink-faint">
        {reviewedCount} of {totalCount} reviewed
      </p>
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
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-line pt-3">
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
    </DrawerShell>
  );
}
