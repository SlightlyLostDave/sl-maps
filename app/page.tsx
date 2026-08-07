import { UserButton } from '@clerk/nextjs';
import MapExplorer from '@/components/map/MapExplorer';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <div className="eyebrow mb-1">SL Maps</div>
          <h1 className="font-display text-2xl text-ink">Crimson &amp; Patina</h1>
        </div>
        <UserButton />
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <MapExplorer />
      </main>
    </div>
  );
}
