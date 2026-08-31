import { signOut } from '@/app/actions/auth';
import { createClient } from '@lib/supabase/server';
import MapExplorer from '@/components/map/MapExplorer';
import AppHeader from '@/components/ui/AppHeader';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-background">
      <AppHeader
        title="SL Maps"
        email={user?.email}
        onSignOut={signOut}
        links={[
          { href: '/review', label: 'Review queue' },
          { href: '/categories', label: 'Categories' },
        ]}
      />
      <main className="flex min-h-0 flex-1 flex-col">
        <MapExplorer />
      </main>
    </div>
  );
}
