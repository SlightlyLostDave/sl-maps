// Category color comes from the DB (`categories.color`). Shape is assigned
// client/server-side by sort_order, cycling through the style guide's six
// shapes, because categories are an open-ended owner-editable set (plus
// whatever the QGIS bulk load minted) rather than a fixed five.
export const CATEGORY_SHAPES = [
  "circle",
  "square",
  "diamond",
  "pentagon",
  "triangle",
  "hollow",
] as const;

export type CategoryShape = (typeof CATEGORY_SHAPES)[number];

export const FALLBACK_CATEGORY_COLOR = "#7c7565"; // --cat-none, dark theme

export type CategoryRow = {
  id: string;
  color: string;
  sort_order: number;
};

export type CategoryStyle = {
  shape: CategoryShape;
  color: string;
};

export function assignCategoryShapes<T extends CategoryRow>(
  categories: T[],
): Map<string, CategoryStyle> {
  const sorted = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
  );
  const styles = new Map<string, CategoryStyle>();
  sorted.forEach((category, index) => {
    styles.set(category.id, {
      shape: CATEGORY_SHAPES[index] ?? "circle",
      color: category.color,
    });
  });
  return styles;
}
