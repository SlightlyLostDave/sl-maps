import CategoryList from '@components/categories/CategoryList';
import CategoryDetail from '@components/categories/CategoryDetail';
import CategoryDetailPanel from '@components/categories/CategoryDetailPanel';
import CategoryLoadingOverlay from '@components/categories/CategoryLoadingOverlay';
import CategoryNavLink from '@components/categories/CategoryNavLink';
import { CategoryTransitionProvider } from '@components/categories/CategoryTransitionContext';
import ContextPanel from '@components/shell/ContextPanel';

export default async function CategoriesPage({
  searchParams,
}: PageProps<'/categories'>) {
  const params = await searchParams;
  const idParam = params.id;
  const selectedId = Array.isArray(idParam) ? idParam[0] : idParam;
  const errorParam = params.error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  return (
    <CategoryTransitionProvider>
      <ContextPanel
        title="Categories"
        actions={
          <CategoryNavLink
            href="/categories?id=new"
            className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              selectedId === 'new'
                ? 'bg-ground-2 text-ink'
                : 'text-ink-dim hover:bg-ground-2 hover:text-ink'
            }`}
          >
            + New
          </CategoryNavLink>
        }
      >
        <CategoryLoadingOverlay />
        <CategoryList selectedId={selectedId} />
      </ContextPanel>
      {selectedId && (
        <CategoryDetailPanel>
          <CategoryLoadingOverlay />
          <CategoryDetail id={selectedId} error={error} />
        </CategoryDetailPanel>
      )}
    </CategoryTransitionProvider>
  );
}
