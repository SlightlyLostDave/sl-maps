import MapExplorer from '@/components/map/MapExplorer';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-line px-6 py-4">
        <h1 className="text-lg font-semibold">SL Maps</h1>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <MapExplorer />
      </main>
    </div>
  );
}
