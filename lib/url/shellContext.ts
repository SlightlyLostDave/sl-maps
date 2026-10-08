export type ShellContextId = 'search' | 'filters' | 'review' | 'categories';

export function contextFromLocation(
  pathname: string,
  panel: string | null,
): ShellContextId {
  if (pathname.startsWith('/review')) return 'review';
  if (pathname.startsWith('/categories')) return 'categories';
  return panel === 'filters' ? 'filters' : 'search';
}
