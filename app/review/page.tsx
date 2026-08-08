import Link from "next/link";
import ReviewExplorer from "@/components/review/ReviewExplorer";

export default async function ReviewPage({
  searchParams,
}: PageProps<"/review">) {
  const params = await searchParams;
  const idParam = params.id;
  const selectedId = Array.isArray(idParam) ? idParam[0] : idParam;

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <div className="eyebrow mb-1">SL Maps</div>
          <h1 className="font-display text-2xl text-ink">Review queue</h1>
        </div>
        <Link href="/" className="text-sm text-ink-dim underline">
          Back to map
        </Link>
      </header>
      <main className="flex min-h-0 flex-1 flex-col p-6">
        <ReviewExplorer selectedId={selectedId} />
      </main>
    </div>
  );
}
