"use client";

import { createContext, useContext, useTransition, type ReactNode, type TransitionStartFunction } from "react";

const CategoryTransitionContext = createContext<{
  isPending: boolean;
  startTransition: TransitionStartFunction;
} | null>(null);

export function CategoryTransitionProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  return (
    <CategoryTransitionContext.Provider value={{ isPending, startTransition }}>
      {children}
    </CategoryTransitionContext.Provider>
  );
}

export function useCategoryTransition() {
  const context = useContext(CategoryTransitionContext);
  if (!context) throw new Error("useCategoryTransition must be used within a CategoryTransitionProvider");
  return context;
}
