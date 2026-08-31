import Spinner from '@components/ui/Spinner';

export default function MapLoadingOverlay({ dim = false }: { dim?: boolean }) {
  return (
    <div
      className={`absolute inset-0 z-10 flex items-center justify-center ${
        dim ? 'bg-(--ground-1)/60 backdrop-blur-[1px]' : 'bg-(--ground-1)'
      }`}
    >
      <div className="flex flex-col items-center gap-2 text-ink-faint">
        <Spinner size="lg" />
        {!dim && (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
            Loading map…
          </span>
        )}
      </div>
    </div>
  );
}
