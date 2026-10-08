import { describe, expect, it } from 'vitest';

import { parseRadiusMeters } from '@lib/url/searchRadius';

describe('parseRadiusMeters', () => {
  it('returns null for a missing or empty value', () => {
    expect(parseRadiusMeters(null)).toBeNull();
    expect(parseRadiusMeters('')).toBeNull();
  });

  it('reads metres, kilometres and miles', () => {
    expect(parseRadiusMeters('5000m')).toBe(5000);
    expect(parseRadiusMeters('100km')).toBe(100_000);
    expect(parseRadiusMeters('50mi')).toBeCloseTo(80_467.2);
  });

  it('treats a bare number as kilometres', () => {
    expect(parseRadiusMeters('25')).toBe(25_000);
  });

  it('accepts decimals, surrounding whitespace, a space before the unit and any case', () => {
    expect(parseRadiusMeters(' 2.5 KM ')).toBe(2500);
    expect(parseRadiusMeters('10 Mi')).toBeCloseTo(16_093.44);
  });

  it('returns zero for a zero radius (the route rejects it)', () => {
    expect(parseRadiusMeters('0')).toBe(0);
  });

  it('returns null for anything else', () => {
    expect(parseRadiusMeters('abc')).toBeNull();
    expect(parseRadiusMeters('-5km')).toBeNull();
    expect(parseRadiusMeters('5ft')).toBeNull();
    expect(parseRadiusMeters('1e3')).toBeNull();
    expect(parseRadiusMeters('.5km')).toBeNull();
  });
});
