import type { IconSvgElement } from '@hugeicons/react';
import { GlobeIcon, Satellite01Icon } from '@hugeicons/core-free-icons';

export type BasemapId = 'dark' | 'satellite';

type Basemap = {
  id: BasemapId;
  label: string;
  url: string;
  icon: IconSvgElement;
};

export const BASEMAPS: Record<BasemapId, Basemap> = {
  dark: {
    id: 'dark',
    label: 'Streets',
    url: 'mapbox://styles/mapbox/dark-v11',
    icon: GlobeIcon,
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
    icon: Satellite01Icon,
  },
};

export const DEFAULT_BASEMAP_ID: BasemapId = 'dark';

export function otherBasemapId(id: BasemapId): BasemapId {
  return id === 'dark' ? 'satellite' : 'dark';
}

const STORAGE_KEY = 'sl-maps:basemap';

export function loadStoredBasemapId(): BasemapId {
  if (typeof window === 'undefined') return DEFAULT_BASEMAP_ID;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' || stored === 'satellite'
      ? stored
      : DEFAULT_BASEMAP_ID;
  } catch {
    return DEFAULT_BASEMAP_ID;
  }
}

export function saveBasemapId(id: BasemapId) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private browsing / storage disabled — persistence is a nice-to-have,
    // not worth surfacing an error for.
  }
}
