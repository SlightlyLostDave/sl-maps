'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';

// At 22k+ unsorted rows, rendering the whole backlog as DOM list items isn't
// viable — this only loads the front of the queue. Real pagination or
// virtualization is follow-up work, matching ReviewList's prior server-side
// cap.
const LIST_PAGE_SIZE = 200;

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
  refresh: () => void;
  nextIdAfter: (currentId: string) => string | null;
};

const ReviewQueueContext = createContext<ReviewQueueValue | null>(null);

export function ReviewQueueProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setLoading(true);
      const [rows, total, remaining] = await Promise.all([
        supabase
          .from('placemarks')
          .select('id, name, categories(slug)')
          .eq('needs_review', true)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .range(0, LIST_PAGE_SIZE - 1)
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

      if (cancelled) return;
      if (!rows.error && rows.data) {
        setItems(
          rows.data.map((row) => ({
            id: row.id,
            name: row.name,
            categorySlug: row.categories?.slug ?? null,
          })),
        );
      }
      const totalN = total.count ?? 0;
      const remainingN = remaining.count ?? 0;
      setTotalCount(totalN);
      setReviewedCount(totalN - remainingN);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const refresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  const nextIdAfter = useCallback(
    (currentId: string) => {
      if (items.length === 0) return null;
      const idx = items.findIndex((item) => item.id === currentId);
      if (idx === -1) return items[0].id;
      if (items.length === 1) return null;
      return items[(idx + 1) % items.length].id;
    },
    [items],
  );

  const value: ReviewQueueValue = {
    items,
    loading,
    totalCount,
    reviewedCount,
    refresh,
    nextIdAfter,
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
