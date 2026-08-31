import Link from 'next/link';
import ReviewExplorerSkeleton from '@/components/review/ReviewExplorerSkeleton';

export default function ReviewLoading() {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-background">
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
        <ReviewExplorerSkeleton />
      </main>
    </div>
  );
}
