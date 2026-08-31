'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createClient } from '@lib/supabase/client';

// At 22k+ unsorted rows, rendering the whole backlog as DOM list items isn't
// viable, so the queue is paginated server-side in PAGE_SIZE chunks ordered
// by created_at.
const PAGE_SIZE = 100;

export type ReviewQueueItem = {
  id: string;
  name: string;
  categorySlug: string | null;
};

type RawRow = {
  id: string;
  name: string;
  categories: { slug: string } | null;
};

type ReviewQueueValue = {
  items: ReviewQueueItem[];
  loading: boolean;
  totalCount: number;
  reviewedCount: number;
  page: number;
  pageCount: number;
  goToPage: (n: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refresh: () => void;
  advanceFrom: (currentId: string) => Promise<string | null>;
};

const ReviewQueueContext = createContext<ReviewQueueValue | null>(null);

export function ReviewQueueProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [remainingCount, setRemainingCount] = useState(0);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const [refreshToken, setRefreshToken] = useState(0);

  // Derived from remainingCount, which is the same "needs_review=true,
  // not deleted" universe being paginated. This can shrink mid-session as
  // items get reviewed and drop out of that set — same property the old
  // single-batch queue already had, just now visible as a shrinking page
  // count instead of a shrinking list.
  const pageCount = Math.max(1, Math.ceil(remainingCount / PAGE_SIZE));

  const loadPage = useCallback(async (targetPage: number) => {
    const supabase = createClient();
    const [rows, total, remaining] = await Promise.all([
      supabase
        .from('placemarks')
        .select('id, name, categories(slug)')
        .eq('needs_review', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(targetPage * PAGE_SIZE, targetPage * PAGE_SIZE + PAGE_SIZE - 1)
        .returns<RawRow[]>(),
      supabase
        .from('placemarks')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),
      supabase
        .from('placemarks')
        .select('id', { count: 'exact', head: true })
        .eq('needs_review', true)
        .is('deleted_at', null),
    ]);

    const mapped =
      !rows.error && rows.data
        ? rows.data.map((row) => ({
            id: row.id,
            name: row.name,
            categorySlug: row.categories?.slug ?? null,
          }))
        : [];
    const totalN = total.count ?? 0;
    const remainingN = remaining.count ?? 0;

    setItems(mapped);
    setTotalCount(totalN);
    setReviewedCount(totalN - remainingN);
    setRemainingCount(remainingN);
    setPage(targetPage);
    pageRef.current = targetPage;
    return mapped;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      await loadPage(pageRef.current);
      if (!cancelled) setLoading(false);
    }
    run();
    return () => {
      cancelled = true;
    };
    // refreshToken is the only intentional trigger here; loadPage always
    // reloads whatever page pageRef currently points at.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const refresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  const goToPage = useCallback(
    (n: number) => {
      const clamped = Math.max(0, Math.min(n, pageCount - 1));
      if (clamped === pageRef.current) return;
      setLoading(true);
      loadPage(clamped).finally(() => setLoading(false));
    },
    [loadPage, pageCount],
  );

  const nextPage = useCallback(() => goToPage(page + 1), [goToPage, page]);
  const prevPage = useCallback(() => goToPage(page - 1), [goToPage, page]);

  const advanceFrom = useCallback(
    async (currentId: string): Promise<string | null> => {
      if (items.length === 0) return null;

      const idx = items.findIndex((item) => item.id === currentId);

      if (idx !== -1 && idx < items.length - 1) {
        const nextId = items[idx + 1].id;
        loadPage(page);
        return nextId;
      }

      const targetPage = page + 1 < pageCount ? page + 1 : 0;
      const nextItems = await loadPage(targetPage);

      return nextItems.length > 0 ? nextItems[0].id : null;
    },
    [items, page, pageCount, loadPage],
  );

  const value: ReviewQueueValue = {
    items,
    loading,
    totalCount,
    reviewedCount,
    page,
    pageCount,
    goToPage,
    nextPage,
    prevPage,
    refresh,
    advanceFrom,
  };

  return (
    <ReviewQueueContext.Provider value={value}>
      {children}
    </ReviewQueueContext.Provider>
  );
}

export function useReviewQueue() {
  const context = useContext(ReviewQueueContext);
  if (!context)
    throw new Error('useReviewQueue must be used within a ReviewQueueProvider');
  return context;
}
