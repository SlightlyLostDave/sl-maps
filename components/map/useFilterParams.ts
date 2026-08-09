"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useFilterTransition } from "./FilterTransitionContext";

export type VisitedStatus = "all" | "visited" | "not_visited";

export function useFilterParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startTransition } = useFilterTransition();

  const activeCatIds = new Set((searchParams.get("cat") ?? "").split(",").filter(Boolean));
  const visitedParam = searchParams.get("visited");
  const visitedStatus: VisitedStatus =
    visitedParam === "1" ? "visited" : visitedParam === "0" ? "not_visited" : "all";
  const wantToGoOn = searchParams.get("want_to_go") === "1";

  const activeFilterCount =
    activeCatIds.size + (visitedStatus !== "all" ? 1 : 0) + (wantToGoOn ? 1 : 0);

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false });
    });
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

  function setCategoryIds(ids: string[]) {
    updateParams((params) => {
      if (ids.length > 0) params.set("cat", ids.join(","));
      else params.delete("cat");
    });
  }

  function setVisited(status: VisitedStatus) {
    updateParams((params) => {
      if (status === "visited") params.set("visited", "1");
      else if (status === "not_visited") params.set("visited", "0");
      else params.delete("visited");
    });
  }

  function toggleWantToGo() {
    updateParams((params) => {
      if (params.get("want_to_go") === "1") params.delete("want_to_go");
      else params.set("want_to_go", "1");
    });
  }

  function clearAll() {
    updateParams((params) => {
      params.delete("cat");
      params.delete("visited");
      params.delete("want_to_go");
    });
  }

  return {
    activeCatIds,
    visitedStatus,
    wantToGoOn,
    activeFilterCount,
    toggleCategory,
    setCategoryIds,
    setVisited,
    toggleWantToGo,
    clearAll,
  };
}
