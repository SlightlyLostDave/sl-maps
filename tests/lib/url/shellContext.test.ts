import { describe, expect, it } from 'vitest';

import { contextFromLocation } from '@lib/url/shellContext';

describe('contextFromLocation', () => {
  it('picks review for /review and its sub-paths', () => {
    expect(contextFromLocation('/review', null)).toBe('review');
    expect(contextFromLocation('/review/abc', null)).toBe('review');
  });

  it('picks categories for /categories and its sub-paths', () => {
    expect(contextFromLocation('/categories', null)).toBe('categories');
    expect(contextFromLocation('/categories/dive', null)).toBe('categories');
  });

  it('picks filters on the map route when panel=filters', () => {
    expect(contextFromLocation('/', 'filters')).toBe('filters');
  });

  it('defaults to search on the map route', () => {
    expect(contextFromLocation('/', null)).toBe('search');
    expect(contextFromLocation('/', 'something-else')).toBe('search');
  });

  it('lets the pathname win over the panel param', () => {
    expect(contextFromLocation('/review', 'filters')).toBe('review');
    expect(contextFromLocation('/categories', 'filters')).toBe('categories');
  });
});
