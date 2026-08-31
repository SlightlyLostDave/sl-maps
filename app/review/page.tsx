import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@lib/supabase/server';
import ReviewExplorer from '@/components/review/ReviewExplorer';

async function firstUnsortedId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('placemarks')
    .select('id')
    .eq('needs_review', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
}

export default async function ReviewPage({
  searchParams,
}: PageProps<'/review'>) {
  const params = await searchParams;
  const idParam = params.id;
  const selectedId = Array.isArray(idParam) ? idParam[0] : idParam;

  if (!selectedId) {
    const firstId = await firstUnsortedId();
    if (firstId) redirect(`/review?id=${firstId}`);
    // else: queue is empty, fall through — ReviewExplorer renders the
    // "all caught up" state itself.
  }

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
        <ReviewExplorer />
      </main>
    </div>
  );
}
