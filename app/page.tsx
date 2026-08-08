import Link from 'next/link';
import { signOut } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/server';
import MapExplorer from '@/components/map/MapExplorer';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <div className="eyebrow mb-1">SL Maps</div>
          <h1 className="font-display text-2xl text-ink">Crimson &amp; Patina</h1>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/review" className="text-sm text-ink-dim underline">
            Review queue
          </Link>
          <form action={signOut} className="flex items-center gap-3">
            {user?.email && <span className="text-sm text-ink">{user.email}</span>}
            <button type="submit" className="text-sm underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <MapExplorer />
      </main>
    </div>
  );
}
