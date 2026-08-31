'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { createClient } from '@lib/supabase/client';

export type TagOption = { id: string; name: string };
export type SelectedTag = { id?: string; name: string };

export default function TagInput({
  selected,
  onChange,
}: {
  selected: SelectedTag[];
  onChange: (tags: SelectedTag[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<TagOption[]>([]);
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const requestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tags')
        .select('id, name')
        .is('deleted_at', null)
        .ilike('name', `%${q}%`)
        .order('usage_count', { ascending: false })
        .limit(8);
      if (requestId !== requestIdRef.current || error || !data) return;
      setSuggestions(data as TagOption[]);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // The dropdown is portaled to document.body (see below) so it can't be
  // clipped by an ancestor's overflow-y-auto (e.g. DetailDrawer's or
  // ReviewDetailPanel's scrollable sheet) — its position has to be computed
  // from the input's own screen rect instead of relying on normal flow.
  useEffect(() => {
    if (!open) return;
    function updateRect() {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width });
    }
    updateRect();
    // Rather than tracking live repositioning, just close on any scroll
    // (capture phase, so it also catches the sheet's own internal scroll).
    function onScroll() {
      setOpen(false);
    }
    window.addEventListener('scroll', onScroll, { capture: true });
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', updateRect);
    };
  }, [open]);

  const trimmedQuery = query.trim();
  const selectedNames = new Set(selected.map((t) => t.name.toLowerCase()));
  // Suggestions from a stale (now-cleared) query are simply not shown rather
  // than cleared via a synchronous setState in the effect above.
  const filteredSuggestions = trimmedQuery
    ? suggestions.filter((s) => !selectedNames.has(s.name.toLowerCase()))
    : [];
  const exactMatch = suggestions.some(
    (s) => s.name.toLowerCase() === trimmedQuery.toLowerCase(),
  );

  function addTag(tag: SelectedTag) {
    if (selectedNames.has(tag.name.toLowerCase())) return;
    onChange([...selected, tag]);
    setQuery('');
    setSuggestions([]);
  }

  function removeTag(name: string) {
    onChange(selected.filter((t) => t.name !== name));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-dim">Tags</span>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <span
              key={tag.name}
              className="flex items-center gap-1 rounded-[3px] border border-line-strong px-1.5 py-0.5 font-mono text-[9px] text-ink-dim"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => removeTag(tag.name)}
                aria-label={`Remove tag ${tag.name}`}
                className="text-ink-faint hover:text-crimson-lift"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              e.preventDefault();
              const match = suggestions.find(
                (s) => s.name.toLowerCase() === query.trim().toLowerCase(),
              );
              addTag(
                match
                  ? { id: match.id, name: match.name }
                  : { name: query.trim() },
              );
            }
          }}
          placeholder="Add a tag…"
          autoComplete="off"
          className="w-full rounded-md border border-line bg-ground-2 px-3 py-2 text-base md:text-sm text-ink"
        />
        {open &&
          query.trim() &&
          dropdownRect &&
          createPortal(
            <div
              style={{
                position: 'fixed',
                top: dropdownRect.top + 4,
                left: dropdownRect.left,
                width: dropdownRect.width,
              }}
              className="z-50 overflow-hidden rounded-md border border-line-strong bg-bg-raised shadow-(--shadow)"
            >
              {filteredSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag({ id: s.id, name: s.name })}
                  className="block w-full px-3 py-1.5 text-left text-sm text-ink-dim hover:bg-ground-2 hover:text-ink"
                >
                  {s.name}
                </button>
              ))}
              {!exactMatch && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag({ name: query.trim() })}
                  className="block w-full px-3 py-1.5 text-left font-mono text-xs text-crimson-lift hover:bg-ground-2"
                >
                  + Create tag &ldquo;{query.trim()}&rdquo;
                </button>
              )}
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
