import Link from 'next/link';
import CategoryExplorer from '@/components/categories/CategoryExplorer';
import CategoryLoadingOverlay from '@/components/categories/CategoryLoadingOverlay';
import { CategoryTransitionProvider } from '@/components/categories/CategoryTransitionContext';

export default async function CategoriesPage({
  searchParams,
}: PageProps<'/categories'>) {
  const params = await searchParams;
  const idParam = params.id;
  const selectedId = Array.isArray(idParam) ? idParam[0] : idParam;
  const errorParam = params.error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <div className="eyebrow mb-1">SL Maps</div>
          <h1 className="font-display text-2xl text-ink">Categories</h1>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/review" className="text-sm text-ink-dim underline">
            Review queue
          </Link>
          <Link href="/" className="text-sm text-ink-dim underline">
            Back to map
          </Link>
        </div>
      </header>
      <main className="relative flex min-h-0 flex-1 flex-col">
        <CategoryTransitionProvider>
          <CategoryLoadingOverlay />
          <CategoryExplorer selectedId={selectedId} error={error} />
        </CategoryTransitionProvider>
      </main>
    </div>
  );
}
