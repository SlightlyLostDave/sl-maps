import CategoryList from "@/components/categories/CategoryList";
import CategoryDetail from "@/components/categories/CategoryDetail";

export default function CategoryExplorer({
  selectedId,
  error,
}: {
  selectedId?: string;
  error?: string;
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-line-strong shadow-(--shadow)">
      <CategoryList selectedId={selectedId} />
      <CategoryDetail id={selectedId} error={error} />
    </div>
  );
}
