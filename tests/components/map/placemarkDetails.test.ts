import { describe, expect, it } from 'vitest';

import {
  detailsToFormValues,
  type PlacemarkDetails,
} from '@components/map/placemarkDetails';

const details: PlacemarkDetails = {
  id: 'p1',
  name: 'Old quarry',
  description: 'Fossils in the east wall',
  lat: 44.5,
  lon: -80.25,
  geom_kind: 'point',
  priority: 2,
  visited: true,
  visit_count: 3,
  first_visited_on: '2024-05-01',
  last_visited_on: '2025-06-01',
  source: 'manual',
  external_url: 'https://example.com/quarry',
  category: {
    id: 'c1',
    slug: 'rockhounding',
    name: 'Rockhounding',
    color: '#8a6d3b',
    icon: 'Diamond',
  },
  tags: [
    { id: 't1', slug: 'fossils', name: 'Fossils' },
    { id: 't2', slug: 'quarry', name: 'Quarry' },
  ],
};

describe('detailsToFormValues', () => {
  it('maps the editable fields and keeps tag ids and names', () => {
    expect(detailsToFormValues(details)).toEqual({
      name: 'Old quarry',
      categoryId: 'c1',
      description: 'Fossils in the east wall',
      priority: 2,
      externalUrl: 'https://example.com/quarry',
      tags: [
        { id: 't1', name: 'Fossils' },
        { id: 't2', name: 'Quarry' },
      ],
    });
  });

  it('turns null text fields into empty strings and keeps a null priority', () => {
    const values = detailsToFormValues({
      ...details,
      description: null,
      external_url: null,
      priority: null,
      tags: [],
    });
    expect(values.description).toBe('');
    expect(values.externalUrl).toBe('');
    expect(values.priority).toBeNull();
    expect(values.tags).toEqual([]);
  });

  it('falls back to an empty category id when the category join is null', () => {
    // The type says category is always present, but the function guards
    // against a null join from the database; cover that guard.
    const values = detailsToFormValues({
      ...details,
      category: null as unknown as PlacemarkDetails['category'],
    });
    expect(values.categoryId).toBe('');
  });
});
