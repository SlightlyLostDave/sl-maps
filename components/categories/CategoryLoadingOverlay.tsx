"use client";

import Spinner from "@/components/ui/Spinner";
import { useCategoryTransition } from "./CategoryTransitionContext";

export default function CategoryLoadingOverlay() {
  const { isPending } = useCategoryTransition();

  if (!isPending) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-(--ground-1)/60 backdrop-blur-[1px]">
      <Spinner size="lg" />
    </div>
  );
}
