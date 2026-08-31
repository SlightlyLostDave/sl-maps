'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Skeleton from '@/components/ui/Skeleton';
import PlacemarkForm from '@/components/map/PlacemarkForm';
import { useMapControls } from '@/components/map/MapControlsContext';
import {
  detailsToFormValues,
  type PlacemarkDetails,
} from '@/components/map/placemarkDetails';
import { useReviewQueue } from './ReviewQueueContext';

export default function ReviewDetailPanel() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { items, refresh, advanceFrom } = useReviewQueue();
  const mapControls = useMapControls();

  const [result, setResult] = useState<{
    id: string;
    data: PlacemarkDetails | null;
  } | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const details = result?.id === id ? result.data : null;
  const loading = id != null && result?.id !== id;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from('placemark_details')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        setResult({ id, data: error ? null : (data as PlacemarkDetails) });
      });
    return () => {
      cancelled = true;
    };
  }, [id, resetKey]);

  useEffect(() => {
    if (!details) return;
    mapControls.flyTo([details.lon, details.lat]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details?.id]);

  async function advance(currentId: string) {
    const next = await advanceFrom(currentId);
    refresh();
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('id', next);
    else params.delete('id');
    window.history.pushState(null, '', next ? `?${params.toString()}` : '?');
  }

  if (!id) {
    return items.length === 0 ? <QueueCompleteState /> : <SelectPromptState />;
  }

  return (
    <aside className="flex w-[420px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-line bg-bg-raised p-6">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow">Reviewing</h2>
        <button
          type="button"
          onClick={() => advance(id)}
          className="font-mono text-xs uppercase tracking-widest text-ink-faint hover:text-ink"
        >
          Skip
        </button>
      </div>

      {loading && (
        <div>
          <Skeleton className="h-6 w-40" />
          <div className="mt-4 flex flex-col gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      )}

      {!loading && !details && (
        <p className="text-sm text-ink-faint">
          That placemark couldn&rsquo;t be found. It may have been deleted.
        </p>
      )}

      {details && (
        <PlacemarkForm
          key={`${id}-${resetKey}`}
          mode="edit"
          placemarkId={details.id}
          initial={detailsToFormValues(details)}
          lat={details.lat}
          lon={details.lon}
          submitLabel="Save & next"
          onSaved={(savedId) => advance(savedId)}
          onCancel={() => setResetKey((n) => n + 1)}
          onDeleted={() => advance(id)}
        />
      )}
    </aside>
  );
}

function SelectPromptState() {
  return (
    <aside className="flex w-[420px] shrink-0 items-center justify-center border-l border-line bg-bg-raised p-6 text-sm text-ink-faint">
      Select a placemark from the queue to review it.
    </aside>
  );
}

function QueueCompleteState() {
  return (
    <aside className="flex w-[420px] shrink-0 flex-col items-center justify-center gap-1 border-l border-line bg-bg-raised p-6 text-center">
      <h2 className="font-display text-xl text-ink">All caught up</h2>
      <p className="text-sm text-ink-faint">
        Nothing left in the review queue.
      </p>
    </aside>
  );
}
