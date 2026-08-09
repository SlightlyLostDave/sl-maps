import { createClient } from "@/lib/supabase/server";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/app/actions/categories";
import SubmitButton from "@/components/ui/SubmitButton";

type CategoryDetailRow = {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  attributes_schema: Record<string, unknown>;
};

type CategoryOption = { id: string; name: string };

const ERROR_MESSAGES: Record<string, string> = {
  name_required: "Name is required.",
  invalid_json: "Attributes schema must be valid JSON (an object).",
  has_children:
    "This category has subcategories, or the chosen parent isn't a top-level category — categories can only nest one level deep.",
  needs_replacement:
    "This category has active placemarks — choose a replacement above before deleting.",
};

async function getCategory(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, color, icon, parent_id, sort_order, attributes_schema")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<CategoryDetailRow>();

  if (error) throw error;
  return data;
}

async function getTopLevelCategories(excludeId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("categories")
    .select("id, name")
    .is("deleted_at", null)
    .is("parent_id", null)
    .order("sort_order", { ascending: true });

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query.returns<CategoryOption[]>();
  if (error) throw error;
  return data;
}

async function getOtherCategories(excludeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .is("deleted_at", null)
    .neq("id", excludeId)
    .order("sort_order", { ascending: true })
    .returns<CategoryOption[]>();
  if (error) throw error;
  return data;
}

async function getDependentCounts(id: string) {
  const supabase = await createClient();
  const [{ count: placemarkCount }, { count: childCount }] = await Promise.all([
    supabase
      .from("placemarks")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id)
      .is("deleted_at", null),
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", id)
      .is("deleted_at", null),
  ]);
  return { placemarkCount: placemarkCount ?? 0, childCount: childCount ?? 0 };
}

function ErrorBanner({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="rounded-md border border-crimson-deep bg-crimson-wash px-3 py-2 text-sm text-crimson-lift">
      {ERROR_MESSAGES[error] ?? "Something went wrong."}
    </p>
  );
}

const inputClass =
  "rounded-md border border-line bg-ground-2 px-3 py-2 text-sm text-ink";

export default async function CategoryDetail({
  id,
  error,
}: {
  id?: string;
  error?: string;
}) {
  if (!id) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-ink-faint">
        Select a category from the list, or create a new one.
      </div>
    );
  }

  if (id === "new") {
    const parentOptions = await getTopLevelCategories();
    return (
      <div className="themed-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto p-6">
        <div>
          <h2 className="eyebrow mb-1">New category</h2>
          <h1 className="font-display text-2xl text-ink">Create category</h1>
        </div>

        <ErrorBanner error={error} />

        <form action={createCategory} className="flex max-w-lg flex-col gap-4">
          <CategoryFields parentOptions={parentOptions} />
          <div>
            <SubmitButton>Create category</SubmitButton>
          </div>
        </form>
      </div>
    );
  }

  const [category, parentOptions] = await Promise.all([
    getCategory(id),
    getTopLevelCategories(id),
  ]);

  if (!category) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-ink-faint">
        That category couldn&rsquo;t be found. It may have been deleted.
      </div>
    );
  }

  const [otherCategories, { placemarkCount, childCount }] = await Promise.all([
    getOtherCategories(category.id),
    getDependentCounts(category.id),
  ]);

  const updateWithId = updateCategory.bind(null, category.id);
  const deleteWithId = deleteCategory.bind(null, category.id);

  return (
    <div className="themed-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto p-6">
      <div>
        <h2 className="eyebrow mb-1">Editing</h2>
        <h1 className="font-display text-2xl text-ink">{category.name}</h1>
      </div>

      <ErrorBanner error={error} />

      <form action={updateWithId} className="flex max-w-lg flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-dim">Slug</span>
          <input
            readOnly
            disabled
            value={category.slug}
            className={`${inputClass} opacity-60`}
          />
        </label>
        <CategoryFields parentOptions={parentOptions} category={category} />
        <div>
          <SubmitButton>Save changes</SubmitButton>
        </div>
      </form>

      <section className="max-w-lg rounded-md border border-crimson-deep p-4">
        <h3 className="mb-2 text-sm font-medium text-ink">Delete category</h3>
        <form action={deleteWithId} className="flex flex-col gap-3">
          {childCount > 0 && (
            <p className="text-xs text-crimson-lift">
              {childCount} subcategor{childCount === 1 ? "y" : "ies"} still
              reference this category. Reassign or delete them first.
            </p>
          )}
          {placemarkCount > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-dim">
                {placemarkCount} placemark{placemarkCount === 1 ? "" : "s"} use
                this category — move them to:
              </span>
              <select
                name="replacement_category_id"
                required
                className={inputClass}
              >
                <option value="">Choose a replacement…</option>
                {otherCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div>
            <SubmitButton disabled={childCount > 0} className="self-start">
              {placemarkCount > 0 ? "Reassign & delete" : "Delete category"}
            </SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}

function CategoryFields({
  parentOptions,
  category,
}: {
  parentOptions: CategoryOption[];
  category?: CategoryDetailRow;
}) {
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-dim">Name</span>
        <input
          type="text"
          name="name"
          required
          defaultValue={category?.name ?? ""}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-dim">Color</span>
        <input
          type="color"
          name="color"
          defaultValue={category?.color ?? "#7C9A55"}
          className={`${inputClass} h-10 w-20 p-1`}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-dim">Icon</span>
        <input
          type="text"
          name="icon"
          defaultValue={category?.icon ?? ""}
          className={inputClass}
        />
        <span className="text-xs text-ink-faint">
          Sprite name — not yet used by map rendering.
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-dim">Parent category</span>
        <select
          name="parent_id"
          defaultValue={category?.parent_id ?? ""}
          className={inputClass}
        >
          <option value="">No parent (top-level)</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-dim">Sort order</span>
        <input
          type="number"
          name="sort_order"
          defaultValue={category?.sort_order ?? 0}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-dim">
          Attributes schema (JSON)
        </span>
        <textarea
          name="attributes_schema"
          rows={6}
          defaultValue={JSON.stringify(category?.attributes_schema ?? {}, null, 2)}
          className={`${inputClass} font-mono`}
        />
      </label>
    </>
  );
}
