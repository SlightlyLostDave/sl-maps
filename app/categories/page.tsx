import CategoryExplorer from '@components/categories/CategoryExplorer';
import CategoryLoadingOverlay from '@components/categories/CategoryLoadingOverlay';
import { CategoryTransitionProvider } from '@components/categories/CategoryTransitionContext';
import AppHeader from '@components/ui/AppHeader';

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
      <AppHeader
        title="Categories"
        eyebrow="SL Maps"
        links={[
          { href: '/review', label: 'Review queue' },
          { href: '/', label: 'Back to map' },
        ]}
      />
      <main className="relative flex min-h-0 flex-1 flex-col">
        <CategoryTransitionProvider>
          <CategoryLoadingOverlay />
          <CategoryExplorer selectedId={selectedId} error={error} />
        </CategoryTransitionProvider>
      </main>
    </div>
  );
}
