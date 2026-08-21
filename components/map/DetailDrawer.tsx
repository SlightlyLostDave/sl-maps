'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Skeleton from '@/components/ui/Skeleton';
import PlacemarkForm, { type PlacemarkFormValues } from './PlacemarkForm';
import type { SelectedTag } from './TagInput';

type PlacemarkDetails = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lon: number;
  geom_kind: string;
  priority: number | null;
  visited: boolean;
  visit_count: number;
  first_visited_on: string | null;
  last_visited_on: string | null;
  source: string;
  external_url: string | null;
  category: {
    id: string;
    slug: string;
    name: string;
    color: string;
    icon: string | null;
  };
  tags: { id: string; slug: string; name: string }[];
};

function detailsToFormValues(details: PlacemarkDetails): PlacemarkFormValues {
  return {
    name: details.name,
    categoryId: details.category?.id ?? '',
    description: details.description ?? '',
    priority: details.priority,
    externalUrl: details.external_url ?? '',
    tags: details.tags.map((t): SelectedTag => ({ id: t.id, name: t.name })),
  };
}

export default function DetailDrawer() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const editing = searchParams.get('edit') === '1';
  const isCreate = id === 'new';
  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');

  // Keyed by the id it was fetched for, so `loading`/`details` can be
  // derived during render instead of needing a synchronous setState at the
  // top of the fetch effect. refreshToken forces a refetch after a save
  // without changing `id` (e.g. closing the edit form back to view mode).
  const [result, setResult] = useState<{
    id: string;
    data: PlacemarkDetails | null;
  } | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const details = result?.id === id ? result.data : null;
  const loading = id != null && !isCreate && result?.id !== id;

  useEffect(() => {
    if (!id || isCreate) return;
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
  }, [id, isCreate, refreshToken]);

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('id');
    params.delete('edit');
    params.delete('lat');
    params.delete('lon');
    const query = params.toString();
    // See the shallow-routing note in MapView's point-click handler: this
    // is pure client state, so update the URL directly rather than via
    // router.push().
    window.history.pushState(null, '', query ? `?${query}` : '?');
  }

  function openEdit() {
    if (!id) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('edit', '1');
    window.history.pushState(null, '', `?${params.toString()}`);
  }

  function closeEdit() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('edit');
    window.history.pushState(null, '', `?${params.toString()}`);
  }

  function openView(placemarkId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', placemarkId);
    params.delete('edit');
    params.delete('lat');
    params.delete('lon');
    window.history.pushState(null, '', `?${params.toString()}`);
  }

  useEffect(() => {
    if (!id) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!id) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center md:static md:z-auto md:h-full md:w-1/2 md:shrink-0 md:items-stretch md:justify-end">
      <div
        className="absolute inset-0 md:hidden"
        onClick={close}
        aria-hidden="true"
      />
      <div className="relative z-10 max-h-[75vh] w-full overflow-y-auto rounded-t-xl border border-line-strong bg-bg-raised shadow-(--shadow) md:max-h-full md:h-full md:w-full md:rounded-none md:border-y-0 md:border-r-0 md:border-l">
        <button
          type="button"
          onClick={close}
          className="mx-auto mt-2.5 block h-1 w-[34px] rounded-full bg-line-strong md:hidden"
          aria-label="Close"
        />
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 hidden font-mono text-xs text-ink-faint hover:text-ink-dim md:block"
        >
          Close
        </button>
        <div className="p-4 pt-3.5 md:pt-4">
          {isCreate && (
            <>
              <h2 className="eyebrow mb-1">New placemark</h2>
              <PlacemarkForm
                mode="create"
                lat={Number(latParam)}
                lon={Number(lonParam)}
                onSaved={(newId) => openView(newId)}
                onCancel={close}
              />
            </>
          )}

          {!isCreate && loading && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <Skeleton className="h-2.25 w-2.25 rounded-full" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-6 w-40" />
              <div className="my-2.5 flex gap-3 border-b border-line pb-3.5">
                <Skeleton className="h-2.5 w-28" />
                <Skeleton className="h-2.5 w-14" />
              </div>
              <div className="grid grid-cols-[84px_1fr] items-center gap-x-3.5 gap-y-2">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          )}

          {!isCreate && !loading && !details && (
            <p className="text-sm text-ink-faint">Placemark not found.</p>
          )}

          {details && editing && (
            <>
              <h2 className="eyebrow mb-1">Editing</h2>
              <PlacemarkForm
                mode="edit"
                placemarkId={details.id}
                initial={detailsToFormValues(details)}
                lat={details.lat}
                lon={details.lon}
                onSaved={() => {
                  setRefreshToken((n) => n + 1);
                  closeEdit();
                }}
                onCancel={closeEdit}
                onDeleted={close}
              />
            </>
          )}

          {details && !editing && (
            <>
              <div
                className="mb-1.5 flex items-center gap-1.5 pr-14 text-[0.688rem] font-bold uppercase tracking-[0.14em] md:pr-16"
                style={{ color: details.category.color }}
              >
                <span
                  className="h-2.25 w-2.25 shrink-0 rounded-full"
                  style={{ background: details.category.color }}
                />
                {details.category.name}
              </div>
              <div className="font-display text-2xl text-ink">
                {details.name}
              </div>

              <div className="my-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5 font-mono text-[9px] text-ink-faint">
                <span>
                  <span>
                    <b className="font-medium text-ink-dim">
                      {details.lat.toFixed(4)}
                    </b>
                    ,{' '}
                    <b className="font-medium text-ink-dim">
                      {details.lon.toFixed(4)}
                    </b>
                  </span>{' '}
                  <span>{details.geom_kind}</span>
                </span>
                <button
                  type="button"
                  onClick={openEdit}
                  className="font-mono text-[10px] uppercase tracking-widest text-ink-faint hover:text-ink"
                >
                  Edit
                </button>
              </div>

              {details.description && (
                <p className="mb-3 text-sm leading-relaxed text-ink-dim">
                  {details.description}
                </p>
              )}

              <div className="grid grid-cols-[84px_1fr] items-center gap-x-3.5 gap-y-2 text-sm">
                <div className="text-[0.688rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
                  Status
                </div>
                <div className="text-ink-dim">
                  {details.visited
                    ? `Visited${details.last_visited_on ? ` · ${details.last_visited_on}` : ''}`
                    : 'Not visited'}
                </div>

                {details.priority != null && (
                  <>
                    <div className="text-[0.688rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
                      Priority
                    </div>
                    <div className="text-ink-dim">{details.priority} / 5</div>
                  </>
                )}

                <div className="text-[0.688rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
                  Source
                </div>
                <div className="text-ink-dim">{details.source}</div>

                {details.tags.length > 0 && (
                  <>
                    <div className="text-[0.688rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {details.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-[3px] border border-line-strong px-1.5 py-0.5 font-mono text-[9px] text-ink-faint"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {details.external_url && (
                <a
                  href={details.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-crimson-lift underline"
                >
                  External link
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
