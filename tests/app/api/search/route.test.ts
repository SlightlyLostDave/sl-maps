import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@app/api/search/route';
import { createClient } from '@lib/supabase/server';

vi.mock('@lib/supabase/server', () => ({ createClient: vi.fn() }));

const rpc = vi.fn();

function search(query: string) {
  return GET(new NextRequest(`http://localhost/api/search?${query}`));
}

async function expectBadRequest(query: string, error: string) {
  const response = await search(query);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error });
  expect(rpc).not.toHaveBeenCalled();
}

beforeEach(() => {
  rpc.mockResolvedValue({
    data: { type: 'FeatureCollection', features: [] },
    error: null,
  });
  vi.mocked(createClient).mockResolvedValue({ rpc } as unknown as Awaited<
    ReturnType<typeof createClient>
  >);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('GET /api/search', () => {
  describe('rejects', () => {
    it('a request with neither q nor lat/lon', async () => {
      await expectBadRequest('', 'Provide q, or lat and lon.');
    });

    it('a whitespace-only q with no lat/lon', async () => {
      await expectBadRequest('q=%20%20', 'Provide q, or lat and lon.');
    });

    it('lat without lon, or lon without lat', async () => {
      const error = 'lat and lon must both be present and numeric.';
      await expectBadRequest('q=wreck&lat=44.5', error);
      await expectBadRequest('q=wreck&lon=-80.25', error);
    });

    it('a non-numeric lat or lon alongside q', async () => {
      await expectBadRequest(
        'q=wreck&lat=north&lon=-80.25',
        'lat and lon must both be present and numeric.',
      );
    });

    it('a non-numeric lat or lon with no q as missing input', async () => {
      await expectBadRequest(
        'lat=north&lon=-80.25',
        'Provide q, or lat and lon.',
      );
    });

    it('a zero radius or one over 2,000 km', async () => {
      await expectBadRequest(
        'lat=44.5&lon=-80.25&radius=0',
        'radius out of range.',
      );
      await expectBadRequest(
        'lat=44.5&lon=-80.25&radius=2001km',
        'radius out of range.',
      );
    });
  });

  it('runs a text-only search with no proximity or filters', async () => {
    const response = await search('q=%20wreck%20');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
    expect(rpc).toHaveBeenCalledExactlyOnceWith('placemarks_search', {
      in_query: 'wreck',
      in_lat: null,
      in_lon: null,
      in_radius_m: null,
      in_category_ids: null,
      in_visited: null,
      in_needs_review: false,
      in_limit: 200,
    });
  });

  it('passes proximity, radius and every filter through', async () => {
    await search(
      'q=wreck&lat=44.5&lon=-80.25&radius=10km&cat=a,,b&visited=0&needs_review=1',
    );
    expect(rpc).toHaveBeenCalledExactlyOnceWith('placemarks_search', {
      in_query: 'wreck',
      in_lat: 44.5,
      in_lon: -80.25,
      in_radius_m: 10_000,
      in_category_ids: ['a', 'b'],
      in_visited: false,
      in_needs_review: true,
      in_limit: 200,
    });
  });

  it('defaults the radius to 50 km when it is missing or unparseable', async () => {
    await search('lat=44.5&lon=-80.25');
    await search('lat=44.5&lon=-80.25&radius=far');
    expect(rpc).toHaveBeenCalledTimes(2);
    for (const [, args] of rpc.mock.calls) {
      expect(args).toMatchObject({ in_query: null, in_radius_m: 50_000 });
    }
  });

  it('accepts a radius of exactly 2,000 km', async () => {
    const response = await search('lat=44.5&lon=-80.25&radius=2000km');
    expect(response.status).toBe(200);
    expect(rpc.mock.calls[0][1]).toMatchObject({ in_radius_m: 2_000_000 });
  });

  it('ignores radius without proximity', async () => {
    await search('q=wreck&radius=10km');
    expect(rpc.mock.calls[0][1]).toMatchObject({ in_radius_m: null });
  });

  it('maps visited=1 to true and any other value to no filter', async () => {
    await search('q=wreck&visited=1');
    await search('q=wreck&visited=yes');
    expect(rpc.mock.calls[0][1]).toMatchObject({ in_visited: true });
    expect(rpc.mock.calls[1][1]).toMatchObject({ in_visited: null });
  });

  it('returns 500 without leaking the database error', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'relation missing' },
    });

    const response = await search('q=wreck');

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Search failed.' });
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
