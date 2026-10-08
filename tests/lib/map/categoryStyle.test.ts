import { describe, expect, it } from 'vitest';

import { buildCategoryStyles } from '@lib/map/categoryStyle';

describe('buildCategoryStyles', () => {
  it('returns an empty map for no categories', () => {
    expect(buildCategoryStyles([]).size).toBe(0);
  });

  it('keys each category by id with only its colour and icon', () => {
    const styles = buildCategoryStyles([
      { id: 'dive', name: 'Dive sites', color: '#336699', icon: 'Anchor' },
      { id: 'urbex', name: 'Urbex', color: '#993333', icon: null },
    ]);
    expect([...styles]).toEqual([
      ['dive', { color: '#336699', icon: 'Anchor' }],
      ['urbex', { color: '#993333', icon: null }],
    ]);
  });

  it('lets a later duplicate id win', () => {
    const styles = buildCategoryStyles([
      { id: 'dive', color: '#111111', icon: null },
      { id: 'dive', color: '#222222', icon: 'Anchor' },
    ]);
    expect(styles.get('dive')).toEqual({ color: '#222222', icon: 'Anchor' });
  });
});
