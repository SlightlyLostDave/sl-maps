import { describe, expect, it } from 'vitest';

import { slugify } from '@lib/slug';

describe('slugify', () => {
  it('lowercases and joins words with hyphens', () => {
    expect(slugify('Dive Sites')).toBe('dive-sites');
  });

  it('collapses runs of punctuation and whitespace into one hyphen', () => {
    expect(slugify('Rock  &  Mineral -- Spots')).toBe('rock-mineral-spots');
  });

  it('strips leading and trailing separators', () => {
    expect(slugify('  --Heritage!-- ')).toBe('heritage');
  });

  it('keeps digits', () => {
    expect(slugify('Route 66')).toBe('route-66');
  });

  it('drops non-ASCII letters rather than transliterating them', () => {
    expect(slugify('Café Noir')).toBe('caf-noir');
  });

  it('returns the default fallback when nothing slug-safe is left', () => {
    expect(slugify('')).toBe('item');
    expect(slugify('!!!')).toBe('item');
  });

  it('returns a custom fallback when given one', () => {
    expect(slugify('???', 'tag')).toBe('tag');
  });
});
