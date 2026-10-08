import { describe, expect, it } from 'vitest';

import { toPointGeometry } from '@lib/map/geometry';

describe('toPointGeometry', () => {
  it('turns a single-coordinate MultiPoint into a Point', () => {
    expect(
      toPointGeometry({ type: 'MultiPoint', coordinates: [[-80.25, 44.5]] }),
    ).toEqual({ type: 'Point', coordinates: [-80.25, 44.5] });
  });

  it('keeps only the first coordinate of a longer MultiPoint', () => {
    expect(
      toPointGeometry({
        type: 'MultiPoint',
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      }),
    ).toEqual({ type: 'Point', coordinates: [1, 2] });
  });

  it('returns any other geometry unchanged', () => {
    const point: GeoJSON.Point = { type: 'Point', coordinates: [1, 2] };
    const polygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    };
    expect(toPointGeometry(point)).toBe(point);
    expect(toPointGeometry(polygon)).toBe(polygon);
  });
});
