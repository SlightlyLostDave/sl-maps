import { describe, expect, it } from 'vitest';

import { parseFilters, parseInitialView, parseNear } from '@lib/url/mapParams';

const params = (query: string) => new URLSearchParams(query);

describe('parseInitialView', () => {
  it('returns the centre as [lng, lat] and the zoom', () => {
    expect(parseInitialView(params('mlat=44.5&mlng=-80.25&z=12.5'))).toEqual({
      center: [-80.25, 44.5],
      zoom: 12.5,
    });
  });

  it('returns null unless mlat, mlng and z are all present', () => {
    expect(parseInitialView(params(''))).toBeNull();
    expect(parseInitialView(params('mlat=44.5&mlng=-80.25'))).toBeNull();
    expect(parseInitialView(params('mlat=44.5&z=6'))).toBeNull();
    expect(parseInitialView(params('mlng=-80.25&z=6'))).toBeNull();
  });

  it('ignores the draft placemark lat/lon params', () => {
    expect(parseInitialView(params('lat=44.5&lon=-80.25&z=6'))).toBeNull();
  });

  it('returns null for non-numeric values', () => {
    expect(parseInitialView(params('mlat=north&mlng=-80&z=6'))).toBeNull();
    expect(parseInitialView(params('mlat=44&mlng=west&z=6'))).toBeNull();
    expect(parseInitialView(params('mlat=44&mlng=-80&z=close'))).toBeNull();
  });

  it('accepts the latitude and longitude bounds', () => {
    expect(parseInitialView(params('mlat=-90&mlng=180&z=1'))).toEqual({
      center: [180, -90],
      zoom: 1,
    });
  });

  it('returns null for an out-of-range latitude or longitude', () => {
    expect(parseInitialView(params('mlat=90.1&mlng=0&z=6'))).toBeNull();
    expect(parseInitialView(params('mlat=-90.1&mlng=0&z=6'))).toBeNull();
    expect(parseInitialView(params('mlat=0&mlng=180.1&z=6'))).toBeNull();
    expect(parseInitialView(params('mlat=0&mlng=-180.1&z=6'))).toBeNull();
  });
});

describe('parseFilters', () => {
  it('returns all-null filters for an empty query', () => {
    expect(parseFilters(params(''))).toEqual({
      categoryIds: null,
      visited: null,
      query: null,
      near: null,
    });
  });

  it('splits cat into ids and drops empty entries', () => {
    expect(parseFilters(params('cat=a,b,,c')).categoryIds).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('treats an empty cat as no category filter', () => {
    expect(parseFilters(params('cat=')).categoryIds).toBeNull();
  });

  it('maps visited=1 and visited=0 to booleans and anything else to null', () => {
    expect(parseFilters(params('visited=1')).visited).toBe(true);
    expect(parseFilters(params('visited=0')).visited).toBe(false);
    expect(parseFilters(params('visited=yes')).visited).toBeNull();
  });

  it('passes q through as-is', () => {
    expect(parseFilters(params('q=%20wreck%20')).query).toBe(' wreck ');
  });

  it('parses near as lat,lon', () => {
    expect(parseFilters(params('near=44.5,-80.25')).near).toEqual({
      lat: 44.5,
      lon: -80.25,
    });
  });

  it('returns null near for a malformed value', () => {
    expect(parseFilters(params('near=44.5')).near).toBeNull();
    expect(parseFilters(params('near=here,there')).near).toBeNull();
  });
});

describe('parseNear', () => {
  it('parses lat,lon', () => {
    expect(parseNear('44.5,-80.25')).toEqual({ lat: 44.5, lon: -80.25 });
  });

  it('tolerates whitespace around each number', () => {
    expect(parseNear(' 44.5 , -80.25 ')).toEqual({ lat: 44.5, lon: -80.25 });
  });

  it('ignores anything after the second value', () => {
    expect(parseNear('1,2,3')).toEqual({ lat: 1, lon: 2 });
  });

  it('returns null when a value is missing or non-numeric', () => {
    expect(parseNear('')).toBeNull();
    expect(parseNear('44.5')).toBeNull();
    expect(parseNear('44.5,west')).toBeNull();
  });
});
