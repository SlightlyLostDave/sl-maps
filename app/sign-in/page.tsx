"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";

export default function SignInPage() {
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="eyebrow mb-1">SL Maps</div>
          <h1 className="font-display text-2xl text-ink">Sign in</h1>
        </div>

        <form action={action} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded border border-line bg-transparent px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded border border-line bg-transparent px-3 py-2"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded bg-ink px-3 py-2 text-background disabled:opacity-50"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
