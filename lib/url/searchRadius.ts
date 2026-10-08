const RADIUS_UNIT_METERS: Record<string, number> = {
  m: 1,
  km: 1000,
  mi: 1609.344,
};

// Accepts "100km", "50mi", "5000m", or a bare number (assumed km) — the
// bare-number fallback is a convenience for hand-typed/curl testing against
// the task's literal endpoint example; the app's own client code always
// sends an explicit unit ("...&radius=50000m") since its internal state
// stores metres directly (see useFilterParams.ts).
export function parseRadiusMeters(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)\s*(km|mi|m)?$/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = (match[2] ?? 'km').toLowerCase();
  return value * RADIUS_UNIT_METERS[unit];
}
