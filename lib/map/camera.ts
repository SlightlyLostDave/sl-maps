// How much of the map's bottom edge the DetailPanel covers, so the camera
// can treat only the visible strip above it as the viewport. The panel
// overlays the map (rather than shrinking it), so this is applied as map
// padding instead of relying on a container resize. Mirrors DetailPanel's
// sizing: flush to the map's bottom edge at h-2/3 on desktop; mobile
// sheets vary with content, so approximate half the height.
export function detailBottomPadding(
  container: HTMLElement | null,
  open: boolean,
) {
  if (!open || !container) return 0;
  const desktop = window.matchMedia('(min-width: 768px)').matches;
  return Math.round(container.clientHeight * (desktop ? 2 / 3 : 0.5));
}
