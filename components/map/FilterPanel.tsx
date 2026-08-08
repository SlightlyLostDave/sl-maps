"use client";

import { useRouter, useSearchParams } from "next/navigation";
import ShapeGlyph from "./ShapeGlyph";
import type { CategoryShape } from "@/lib/map/categoryStyle";

export type CategoryItem = {
  id: string;
  slug: string;
  name: string;
  color: string;
  shape: CategoryShape;
  count: number;
};

function pillClass(active: boolean) {
  return `rounded-md border px-3 py-1.5 text-xs font-mono transition-colors ${
    active
      ? "border-crimson bg-crimson-wash text-ink"
      : "border-line-strong text-ink-dim hover:text-ink"
  }`;
}

export default function FilterPanel({ categories }: { categories: CategoryItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCatIds = new Set((searchParams.get("cat") ?? "").split(",").filter(Boolean));
  const visitedOn = searchParams.get("visited") === "1";
  const wantToGoOn = searchParams.get("want_to_go") === "1";

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function toggleCategory(id: string) {
    updateParams((params) => {
      const ids = new Set((params.get("cat") ?? "").split(",").filter(Boolean));
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      if (ids.size > 0) params.set("cat", [...ids].join(","));
      else params.delete("cat");
    });
  }

  function toggleFlag(key: "visited" | "want_to_go") {
    updateParams((params) => {
      if (params.get(key) === "1") params.delete(key);
      else params.set(key, "1");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-1">
        {categories.map((category) => {
          const active = activeCatIds.has(category.id);
          return (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                aria-pressed={active}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-crimson-wash text-ink"
                    : "text-ink-dim hover:bg-ground-2 hover:text-ink"
                }`}
              >
                <span className="flex items-center gap-2">
                  <ShapeGlyph shape={category.shape} color={category.color} />
                  {category.name}
                </span>
                <span className="font-mono text-xs text-ink-faint">{category.count}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => toggleFlag("visited")}
          aria-pressed={visitedOn}
          className={pillClass(visitedOn)}
        >
          Visited
        </button>
        <button
          type="button"
          onClick={() => toggleFlag("want_to_go")}
          aria-pressed={wantToGoOn}
          className={pillClass(wantToGoOn)}
        >
          Want to go
        </button>
      </div>
    </div>
  );
}
