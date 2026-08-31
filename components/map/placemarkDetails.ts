import type { PlacemarkFormValues } from './PlacemarkForm';
import type { SelectedTag } from './TagInput';

export type PlacemarkDetails = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lon: number;
  geom_kind: string;
  priority: number | null;
  visited: boolean;
  visit_count: number;
  first_visited_on: string | null;
  last_visited_on: string | null;
  source: string;
  external_url: string | null;
  category: {
    id: string;
    slug: string;
    name: string;
    color: string;
    icon: string | null;
  };
  tags: { id: string; slug: string; name: string }[];
};

export function detailsToFormValues(
  details: PlacemarkDetails,
): PlacemarkFormValues {
  return {
    name: details.name,
    categoryId: details.category?.id ?? '',
    description: details.description ?? '',
    priority: details.priority,
    externalUrl: details.external_url ?? '',
    tags: details.tags.map((t): SelectedTag => ({ id: t.id, name: t.name })),
  };
}
