'use client';

import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  createPlacemark,
  savePlacemark,
  deletePlacemark,
} from '@/app/actions/placemarks';
import { createCategoryQuick } from '@/app/actions/categories';
import { useMapControls } from './MapControlsContext';
import TagInput, { type SelectedTag } from './TagInput';
import LogVisitModal from './LogVisitModal';

type CategoryOption = { id: string; name: string; color: string };

export type PlacemarkFormValues = {
  name: string;
  categoryId: string;
  description: string;
  priority: number | null;
  externalUrl: string;
  tags: SelectedTag[];
};

export const inputClass =
  'rounded-md border border-line bg-ground-2 px-3 py-2 text-sm text-ink';

const emptyValues: PlacemarkFormValues = {
  name: '',
  categoryId: '',
  description: '',
  priority: null,
  externalUrl: '',
  tags: [],
};

function buildFormData(values: PlacemarkFormValues) {
  const fd = new FormData();
  fd.set('name', values.name);
  fd.set('category_id', values.categoryId);
  fd.set('description', values.description);
  if (values.priority != null) fd.set('priority', String(values.priority));
  fd.set('external_url', values.externalUrl);
  for (const tag of values.tags) {
    if (tag.id) fd.append('tag_id', tag.id);
    else fd.append('tag_name', tag.name);
  }
  return fd;
}

export default function PlacemarkForm({
  mode,
  placemarkId,
  initial,
  lat,
  lon,
  onSaved,
  onCancel,
  onDeleted,
  submitLabel,
}: {
  mode: 'create' | 'edit';
  placemarkId?: string;
  initial?: PlacemarkFormValues;
  lat: number;
  lon: number;
  onSaved: (id: string) => void;
  onCancel: () => void;
  onDeleted?: () => void;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<PlacemarkFormValues>(
    initial ?? emptyValues,
  );
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [logVisitOpen, setLogVisitOpen] = useState(false);
  const { refresh, flyTo } = useMapControls();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from('categories')
      .select('id, name, color')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .then(({ data, error: err }) => {
        if (cancelled || err || !data) return;
        setCategories(data as CategoryOption[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof PlacemarkFormValues>(
    key: K,
    value: PlacemarkFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    const fd = new FormData();
    fd.set('name', name);
    const result = await createCategoryQuick(fd);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setCategories((prev) => [...prev, result]);
    update('categoryId', result.id);
    setNewCategoryName('');
    setShowNewCategory(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!values.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!values.categoryId) {
      setError('Choose a category.');
      return;
    }
    setError(null);

    startTransition(async () => {
      const fd = buildFormData(values);
      if (mode === 'create') {
        fd.set('lat', String(lat));
        fd.set('lon', String(lon));
        const result = await createPlacemark(fd);
        if ('error' in result) {
          setError(result.error);
          return;
        }
        refresh();
        flyTo([lon, lat]);
        onSaved(result.id);
      } else if (placemarkId) {
        const result = await savePlacemark(placemarkId, fd);
        if ('error' in result) {
          setError(result.error);
          return;
        }
        refresh();
        onSaved(placemarkId);
      }
    });
  }

  function handleDescriptionBlur() {
    if (mode !== 'edit' || !placemarkId) return;
    if (values.description === (initial?.description ?? '')) return;
    if (!values.name.trim() || !values.categoryId) return;
    startTransition(async () => {
      const fd = buildFormData(values);
      const result = await savePlacemark(placemarkId, fd);
      if (!('error' in result)) {
        setSavedNote('Saved');
        refresh();
        setTimeout(() => setSavedNote(null), 1500);
      }
    });
  }

  function handleDelete() {
    if (!placemarkId) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startDeleteTransition(async () => {
      const result = await deletePlacemark(placemarkId);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      refresh();
      onDeleted?.();
    });
  }

  return (
    <>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-md border border-crimson-deep bg-crimson-wash px-3 py-2 text-sm text-crimson-lift">
            {error}
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-dim">Name</span>
          <input
            type="text"
            required
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
            className={inputClass}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-dim">Category</span>
          <select
            value={values.categoryId}
            onChange={(e) => update('categoryId', e.target.value)}
            className={inputClass}
          >
            <option value="">Choose a category…</option>
            {[...categories]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          {!showNewCategory ? (
            <button
              type="button"
              onClick={() => setShowNewCategory(true)}
              className="self-start font-mono text-xs text-crimson-lift"
            >
              + New category
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                className="rounded-md border border-line px-3 py-2 text-sm text-ink-dim hover:text-ink"
              >
                Add
              </button>
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="flex items-center justify-between text-xs font-medium text-ink-dim">
            Description
            {savedNote && (
              <span className="text-crimson-lift">{savedNote}</span>
            )}
          </span>
          <textarea
            value={values.description}
            onChange={(e) => update('description', e.target.value)}
            onBlur={handleDescriptionBlur}
            rows={5}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-dim">Priority</span>
          <select
            value={values.priority ?? ''}
            onChange={(e) =>
              update('priority', e.target.value ? Number(e.target.value) : null)
            }
            className={inputClass}
          >
            <option value="">None</option>
            {[1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-dim">External URL</span>
          <input
            type="url"
            value={values.externalUrl}
            onChange={(e) => update('externalUrl', e.target.value)}
            className={inputClass}
          />
        </label>

        <TagInput
          selected={values.tags}
          onChange={(tags) => update('tags', tags)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-crimson px-4 py-2 text-sm font-medium text-on-crimson transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? 'Saving…'
              : (submitLabel ??
                (mode === 'create' ? 'Create placemark' : 'Save changes'))}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line px-4 py-2 text-sm text-ink-dim"
          >
            Cancel
          </button>

          {mode === 'edit' && (
            <>
              <button
                type="button"
                onClick={() => setLogVisitOpen(true)}
                className="rounded-md border border-line px-4 py-2 text-sm text-ink-dim hover:text-ink"
              >
                Log a visit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="ml-auto rounded-md border border-crimson-deep px-4 py-2 text-sm text-crimson-lift disabled:opacity-50"
              >
                {confirmingDelete ? 'Confirm delete' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </form>
      {mode === 'edit' && placemarkId && (
        <LogVisitModal
          open={logVisitOpen}
          placemarkId={placemarkId}
          onClose={() => setLogVisitOpen(false)}
          onLogged={() => {
            setSavedNote('Visit logged');
            refresh();
            setTimeout(() => setSavedNote(null), 1500);
          }}
        />
      )}
    </>
  );
}
