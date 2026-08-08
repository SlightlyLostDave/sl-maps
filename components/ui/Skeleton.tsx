export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-(--radius-s) bg-ground-2 ${className}`} />;
}
