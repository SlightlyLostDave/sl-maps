'use client';

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import { logVisit } from '@/app/actions/placemarks';
import { inputClass } from './PlacemarkForm';

export default function LogVisitModal({
  open,
  placemarkId,
  onClose,
  onLogged,
}: {
  open: boolean;
  placemarkId: string;
  onClose: () => void;
  onLogged: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleClose() {
    setDate('');
    setNotes('');
    setError(null);
    onClose();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await logVisit(
        placemarkId,
        date === '' ? null : date,
        notes.trim() === '' ? null : notes,
      );
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setDate('');
      setNotes('');
      onLogged();
      onClose();
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="m-auto w-full max-w-md rounded-lg border border-line bg-ground-2 p-0 text-ink backdrop:bg-black/50"
    >
      <form onSubmit={submit} className="flex flex-col gap-4 p-5">
        <h2 className="text-sm font-medium text-ink">Log a visit</h2>
        {error && (
          <p className="rounded-md border border-crimson-deep bg-crimson-wash px-3 py-2 text-sm text-crimson-lift">
            {error}
          </p>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-dim">
            Date (optional)
          </span>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-dim">
            Notes (optional)
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className={inputClass}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-crimson px-4 py-2 text-sm font-medium text-on-crimson transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Logging…' : 'Log visit'}
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-md border border-line px-4 py-2 text-sm text-ink-dim"
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
