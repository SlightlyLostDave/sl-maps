import Link from "next/link";
import Skeleton from "@/components/ui/Skeleton";

export default function ReviewLoading() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <div className="eyebrow mb-1">SL Maps</div>
          <h1 className="font-display text-2xl text-ink">Review queue</h1>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/categories" className="text-sm text-ink-dim underline">
            Categories
          </Link>
          <Link href="/" className="text-sm text-ink-dim underline">
            Back to map
          </Link>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-line-strong shadow-(--shadow)">
          <aside className="flex w-80 shrink-0 flex-col gap-4 border-r border-line bg-bg-raised p-5">
            <div>
              <Skeleton className="mb-1 h-3 w-24" />
              <Skeleton className="h-2.5 w-32" />
            </div>
            <div className="flex flex-col gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </aside>
          <div className="flex flex-1 flex-col gap-5 p-6">
            <div>
              <Skeleton className="mb-1 h-3 w-16" />
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="flex max-w-lg flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-9 w-36" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
