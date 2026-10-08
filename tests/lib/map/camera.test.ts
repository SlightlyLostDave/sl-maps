import { afterEach, describe, expect, it, vi } from 'vitest';

import { detailBottomPadding } from '@lib/map/camera';

const container = (clientHeight: number) => ({ clientHeight }) as HTMLElement;

function stubViewport(desktop: boolean) {
  const matchMedia = vi.fn((query: string) => ({
    matches: desktop && query === '(min-width: 768px)',
  }));
  vi.stubGlobal('window', { matchMedia });
  return matchMedia;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('detailBottomPadding', () => {
  it('is zero while the detail panel is closed', () => {
    const matchMedia = stubViewport(true);
    expect(detailBottomPadding(container(900), false)).toBe(0);
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it('is zero without a container', () => {
    stubViewport(true);
    expect(detailBottomPadding(null, true)).toBe(0);
  });

  it('covers two thirds of the map on desktop', () => {
    const matchMedia = stubViewport(true);
    expect(detailBottomPadding(container(900), true)).toBe(600);
    expect(detailBottomPadding(container(901), true)).toBe(601);
    expect(matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
  });

  it('covers half the map on mobile', () => {
    stubViewport(false);
    expect(detailBottomPadding(container(900), true)).toBe(450);
    expect(detailBottomPadding(container(901), true)).toBe(451);
  });
});
