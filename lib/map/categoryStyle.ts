export const FALLBACK_CATEGORY_COLOR = "#7c7565"; // --cat-none, dark theme

export type CategoryIconStyle = {
  color: string;
  icon: string | null;
};

export function buildCategoryStyles<
  T extends { id: string; color: string; icon: string | null },
>(categories: T[]): Map<string, CategoryIconStyle> {
  const styles = new Map<string, CategoryIconStyle>();
  for (const category of categories) {
    styles.set(category.id, { color: category.color, icon: category.icon });
  }
  return styles;
}
