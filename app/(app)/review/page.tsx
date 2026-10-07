import { redirect } from 'next/navigation';

import { createClient } from '@lib/supabase/server';
import ReviewList from '@components/review/ReviewList';
import ReviewDetailPanel from '@components/review/ReviewDetailPanel';
import { ReviewQueueProvider } from '@components/review/ReviewQueueContext';

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
    // else: queue is empty, fall through — ReviewList renders the
    // "all caught up" state itself.
  }

  // The queue provider is page-scoped (not in the (app) layout) so the
  // backlog only loads while the review context is open.
  return (
    <ReviewQueueProvider>
      <ReviewList />
      <ReviewDetailPanel />
    </ReviewQueueProvider>
  );
}
