import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@lib/supabase/server';

const DEFAULT_RADIUS_M = 50_000;
const MAX_RADIUS_M = 2_000_000; // 2,000 km sanity cap
const RESULT_LIMIT = 200;

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
function parseRadiusMeters(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)\s*(km|mi|m)?$/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = (match[2] ?? 'km').toLowerCase();
  return value * RADIUS_UNIT_METERS[unit];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get('q')?.trim() || null;
  const latRaw = searchParams.get('lat');
  const lonRaw = searchParams.get('lon');
  const lat = latRaw != null ? Number(latRaw) : null;
  const lon = lonRaw != null ? Number(lonRaw) : null;
  const hasProximity =
    lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon);

  if (!q && !hasProximity) {
    return NextResponse.json(
      { error: 'Provide q, or lat and lon.' },
      { status: 400 },
    );
  }
  if ((latRaw != null || lonRaw != null) && !hasProximity) {
    return NextResponse.json(
      { error: 'lat and lon must both be present and numeric.' },
      { status: 400 },
    );
  }

  let radiusM: number | null = null;
  if (hasProximity) {
    radiusM = parseRadiusMeters(searchParams.get('radius')) ?? DEFAULT_RADIUS_M;
    if (!Number.isFinite(radiusM) || radiusM <= 0 || radiusM > MAX_RADIUS_M) {
      return NextResponse.json(
        { error: 'radius out of range.' },
        { status: 400 },
      );
    }
  }

  const catParam = searchParams.get('cat');
  const categoryIds = catParam ? catParam.split(',').filter(Boolean) : null;
  const visitedParam = searchParams.get('visited');
  const visited =
    visitedParam === '1' ? true : visitedParam === '0' ? false : null;
  const needsReview = searchParams.get('needs_review') === '1';

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('placemarks_search', {
    in_query: q,
    in_lat: hasProximity ? lat : null,
    in_lon: hasProximity ? lon : null,
    in_radius_m: radiusM,
    in_category_ids: categoryIds,
    in_visited: visited,
    in_needs_review: needsReview,
    in_limit: RESULT_LIMIT,
  });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 });
  }

  return NextResponse.json(data);
}
