export type Filters = {
  categoryIds: string[] | null;
  visited: boolean | null;
  query: string | null;
  near: { lat: number; lon: number } | null;
};

export type NearPoint = { lat: number; lon: number };

// Map viewport uses its own `mlat`/`mlng`/`z` params, distinct from the
// `lat`/`lon` params used elsewhere in MapView for a draft placemark's
// location, so the two don't collide when both are present in the URL.
export function parseInitialView(
  params: URLSearchParams,
): { center: [number, number]; zoom: number } | null {
  if (!params.has('mlat') || !params.has('mlng') || !params.has('z')) {
    return null;
  }
  const lat = Number(params.get('mlat'));
  const lng = Number(params.get('mlng'));
  const zoom = Number(params.get('z'));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(zoom) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { center: [lng, lat], zoom };
}

export function parseFilters(params: URLSearchParams): Filters {
  const catParam = params.get('cat');
  const categoryIds = catParam ? catParam.split(',').filter(Boolean) : null;
  const visitedParam = params.get('visited');
  const visited =
    visitedParam === '1' ? true : visitedParam === '0' ? false : null;

  const query = params.get('q');
  const nearParam = params.get('near');
  const near = (() => {
    if (!nearParam) return null;
    const [latStr, lonStr] = nearParam.split(',');
    const lat = Number(latStr);
    const lon = Number(lonStr);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  })();

  return { categoryIds, visited, query, near };
}

export function parseNear(raw: string): NearPoint | null {
  const [latStr, lonStr] = raw.split(',');
  const lat = Number(latStr);
  const lon = Number(lonStr);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}
