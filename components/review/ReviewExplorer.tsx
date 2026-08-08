import ReviewList from "@/components/review/ReviewList";
import ReviewDetail from "@/components/review/ReviewDetail";

export default function ReviewExplorer({ selectedId }: { selectedId?: string }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-line-strong shadow-(--shadow)">
      <ReviewList selectedId={selectedId} />
      <ReviewDetail id={selectedId} />
    </div>
  );
}
