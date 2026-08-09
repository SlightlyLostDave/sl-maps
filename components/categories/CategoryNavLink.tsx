"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCategoryTransition } from "./CategoryTransitionContext";

export default function CategoryNavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { startTransition } = useCategoryTransition();

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        startTransition(() => {
          router.push(href);
        });
      }}
    >
      {children}
    </Link>
  );
}
