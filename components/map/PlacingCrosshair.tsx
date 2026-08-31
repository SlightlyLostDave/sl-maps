export default function PlacingCrosshair() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      {/* Bottom-anchored, same convention as the map's real pins
          (icon-anchor: 'bottom'), so this teardrop's tip lands exactly on
          the container's true center. */}
      <div className="-translate-y-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
          <path
            d="M17 3c-6.075 0-11 4.925-11 11 0 8.25 11 17 11 17s11-8.75 11-17c0-6.075-4.925-11-11-11z"
            fill="var(--crimson)"
            stroke="var(--pin-stroke)"
            strokeWidth="1.5"
          />
          <circle cx="17" cy="14" r="4" fill="var(--on-crimson)" />
        </svg>
      </div>
    </div>
  );
}
