import { createClient } from "@/lib/supabase/server";
import { updatePlacemark, skipPlacemark } from "@/app/actions/placemarks";

type PlacemarkDetail = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
};

type Category = {
  id: string;
  name: string;
};

async function getPlacemark(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("placemarks")
    .select("id, name, description, category_id")
    .eq("id", id)
    .maybeSingle<PlacemarkDetail>();

  if (error) throw error;
  return data;
}

async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .returns<Category[]>();

  if (error) throw error;
  return data;
}

export default async function ReviewDetail({ id }: { id?: string }) {
  if (!id) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-ink-faint">
        Select a placemark from the queue to review it.
      </div>
    );
  }

  const [placemark, categories] = await Promise.all([
    getPlacemark(id),
    getCategories(),
  ]);

  if (!placemark) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-ink-faint">
        That placemark couldn&rsquo;t be found. It may have been deleted.
      </div>
    );
  }

  const updateWithId = updatePlacemark.bind(null, placemark.id);
  const skipWithId = skipPlacemark.bind(null, placemark.id);

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
      <div>
        <h2 className="eyebrow mb-1">Reviewing</h2>
        <h1 className="font-display text-2xl text-ink">{placemark.name}</h1>
      </div>

      {/* TODO: a location preview (static map image or mini interactive map)
          once the anchor column's PostgREST/GeoJSON serialization is confirmed. */}

      <form action={updateWithId} className="flex max-w-lg flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-dim">Category</span>
          <select
            name="category_id"
            defaultValue={placemark.category_id ?? ""}
            className="rounded-md border border-line bg-ground-2 px-3 py-2 text-sm text-ink"
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-dim">
            Description
          </span>
          <textarea
            name="description"
            defaultValue={placemark.description ?? ""}
            rows={6}
            className="rounded-md border border-line bg-ground-2 px-3 py-2 text-sm text-ink"
          />
        </label>

        <section className="rounded-md border border-dashed border-line px-3 py-3">
          <span className="text-xs font-medium text-ink-faint">
            Media — coming soon
          </span>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-crimson px-4 py-2 text-sm font-medium text-on-crimson"
          >
            Save &amp; mark reviewed
          </button>
          <button
            type="submit"
            formAction={skipWithId}
            className="rounded-md border border-line px-4 py-2 text-sm text-ink-dim"
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}
