"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import Spinner from "./Spinner";

type Variant = "primary" | "outline";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-crimson text-on-crimson",
  outline: "border border-line text-ink-dim",
};

const spinnerClass: Record<Variant, string> = {
  primary: "border-on-crimson/40 border-t-on-crimson",
  outline: "border-line-strong border-t-ink-dim",
};

export default function SubmitButton({
  children,
  variant = "primary",
  className = "",
  disabled,
  formAction,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
  formAction?: ComponentProps<"button">["formAction"];
}) {
  // pending reflects the whole form's submission state, not just this
  // button — if a form has multiple SubmitButtons (e.g. Save + Skip in
  // ReviewDetail), clicking either disables both. That's intentional: it
  // prevents double-submitting via the other action while one is in flight.
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending || disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {pending && <Spinner size="xs" className={spinnerClass[variant]} />}
      {children}
    </button>
  );
}
