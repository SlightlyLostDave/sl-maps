import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// At 22k+ unsorted rows, rendering the whole backlog as DOM list items isn't
// viable — this skeleton shows the front of the queue only. Real pagination
// or virtualization is follow-up work, not part of this skeleton.
const LIST_PAGE_SIZE = 200;

type UnsortedRow = {
  id: string;
  name: string;
  categories: { slug: string } | null;
};

async function getUnsortedPlacemarks() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("placemarks")
    .select("id, name, categories(slug)")
    .eq("needs_review", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .range(0, LIST_PAGE_SIZE - 1)
    .returns<UnsortedRow[]>();

  if (error) throw error;
  return data;
}

async function getProgress() {
  const supabase = await createClient();

  const [total, remaining] = await Promise.all([
    supabase
      .from("placemarks")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("placemarks")
      .select("id", { count: "exact", head: true })
      .eq("needs_review", true)
      .is("deleted_at", null),
  ]);

  if (total.error) throw total.error;
  if (remaining.error) throw remaining.error;

  const totalCount = total.count ?? 0;
  const remainingCount = remaining.count ?? 0;
  return { reviewed: totalCount - remainingCount, total: totalCount };
}

export default async function ReviewList({
  selectedId,
}: {
  selectedId?: string;
}) {
  const [placemarks, progress] = await Promise.all([
    getUnsortedPlacemarks(),
    getProgress(),
  ]);

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-bg-raised p-5">
      <div>
        <h2 className="eyebrow mb-1">Review queue</h2>
        <p className="text-xs text-ink-faint">
          {progress.reviewed} of {progress.total} reviewed
        </p>
      </div>
      <ul className="flex flex-col gap-1">
        {placemarks.map((placemark) => {
          const isSelected = placemark.id === selectedId;
          return (
            <li key={placemark.id}>
              <Link
                href={`/review?id=${placemark.id}`}
                className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  isSelected
                    ? "bg-ground-2 text-ink"
                    : "text-ink-dim hover:bg-ground-2 hover:text-ink"
                }`}
              >
                <span className="truncate">{placemark.name}</span>
                <span className="shrink-0 font-mono text-xs text-ink-faint">
                  {placemark.categories?.slug ?? "uncategorized"}
                </span>
              </Link>
            </li>
          );
        })}
        {placemarks.length === 0 && (
          <li className="px-2 py-1.5 text-sm text-ink-faint">
            Nothing left to review.
          </li>
        )}
      </ul>
    </aside>
  );
}
