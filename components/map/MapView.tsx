'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { createClient } from '@/lib/supabase/client';
import {
  buildCategoryStyles,
  type CategoryIconStyle,
} from '@/lib/map/categoryStyle';
import {
  pinIconName,
  FALLBACK_PIN_NAME,
  registerFallbackPin,
  registerCategoryIcons,
} from '@/lib/map/markerIcons';
import {
  BASEMAPS,
  loadStoredBasemapId,
  otherBasemapId,
  saveBasemapId,
  type BasemapId,
} from '@/lib/map/basemaps';
import MapLoadingOverlay from './MapLoadingOverlay';
import AddPlacemarkToolbar from './AddPlacemarkToolbar';
import BasemapSwitcher from './BasemapSwitcher';
import { useFilterTransition } from './FilterTransitionContext';
import { useMapControls } from './MapControlsContext';

const SOURCE_ID = 'placemarks';
const CLUSTER_HALO_LAYER = 'placemarks-cluster-halo';
const CLUSTER_CIRCLE_LAYER = 'placemarks-cluster-circle';
const CLUSTER_COUNT_LAYER = 'placemarks-cluster-count';
const POINT_LAYER = 'placemarks-point';
const LARGE_CLUSTER_THRESHOLD = 100;

type PlacemarkFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  {
    id: string;
    name: string;
    category_id: string;
    priority: number | null;
    visited: boolean;
    tags: string;
    icon_image?: string;
  }
>;
type PlacemarkCollection = GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  PlacemarkFeature['properties']
>;

type Filters = {
  categoryIds: string[] | null;
  visited: boolean | null;
};

const DEFAULT_CENTER: [number, number] = [-80.5, 44.5];
const DEFAULT_ZOOM = 6;

// Map viewport uses its own `mlat`/`mlng`/`z` params, distinct from the
// `lat`/`lon` params used elsewhere in this file for a draft placemark's
// location, so the two don't collide when both are present in the URL.
function parseInitialView(
  params: URLSearchParams,
): { center: [number, number]; zoom: number } | null {
  if (!params.has('mlat') || !params.has('mlng') || !params.has('z')) {
    return null;
  }
  const lat = Number(params.get('mlat'));
  const lng = Number(params.get('mlng'));
  const zoom = Number(params.get('z'));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(zoom) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { center: [lng, lat], zoom };
}

// Called on every moveend so reloading or sharing the URL restores the same
// viewport. replaceState (not pushState) keeps camera panning out of browser
// history — only explicit navigations like opening a placemark should be
// back-button stops.
function updateViewParams(map: mapboxgl.Map) {
  const center = map.getCenter();
  const params = new URLSearchParams(window.location.search);
  params.set('mlat', center.lat.toFixed(5));
  params.set('mlng', center.lng.toFixed(5));
  params.set('z', map.getZoom().toFixed(2));
  window.history.replaceState(null, '', `?${params.toString()}`);
}

function parseFilters(params: URLSearchParams): Filters {
  const catParam = params.get('cat');
  const categoryIds = catParam ? catParam.split(',').filter(Boolean) : null;
  const visitedParam = params.get('visited');
  const visited =
    visitedParam === '1' ? true : visitedParam === '0' ? false : null;

  return { categoryIds, visited };
}

// The QGIS import backlog (sql/0001_placemarks_needs_review.sql) left some
// placemarks stored as single-coordinate MultiPoint geometry. Mapbox's
// clustered GeoJSON source only indexes Point features via Supercluster —
// a MultiPoint mixed into the collection silently breaks clustering for the
// whole source (no error event, tiles just come back empty), which is what
// made pins vanish after panning into an area containing one.
function toPointGeometry(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geometry.type === 'MultiPoint') {
    return { type: 'Point', coordinates: geometry.coordinates[0] };
  }
  return geometry;
}

function cssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

// Runtime paint/layout overrides on the stock dark-v11 style instead of a
// hosted custom Studio style: crimson pins need a quiet basemap under them,
// and a full custom style is real design/hosting work already scoped to the
// "Later" public-layer step.
function quietenBasemap(map: mapboxgl.Map) {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    const id = layer.id.toLowerCase();
    try {
      if (id.includes('poi')) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      } else if (id.includes('road') && layer.type === 'line') {
        map.setPaintProperty(layer.id, 'line-opacity', 0.35);
      }
    } catch {
      // Style layer ids can shift between Mapbox style versions; skip
      // whatever this version doesn't have rather than failing map load.
    }
  }

  if (map.getLayer('water')) {
    map.setPaintProperty(
      'water',
      'fill-color',
      cssVar('--map-water', '#14211f'),
    );
  }
}

// Opens the create-placemark panel by setting the same `?id=new&lat=&lon=`
// URL shape DetailDrawer reads, via the shallow-routing escape hatch used
// throughout this file (see the point-click handler's comment for why
// router.push() doesn't work on this fully-dynamic route).
function openCreatePanel(lat: number, lon: number) {
  const params = new URLSearchParams(window.location.search);
  params.set('id', 'new');
  params.set('lat', String(lat));
  params.set('lon', String(lon));
  params.delete('edit');
  window.history.pushState(null, '', `?${params.toString()}`);
}

class ZoomControl implements mapboxgl.IControl {
  private container?: HTMLDivElement;

  onAdd(map: mapboxgl.Map) {
    const container = document.createElement('div');
    // mapboxgl only applies its default 10px top-right margin to elements
    // carrying the "mapboxgl-ctrl" class (see NavigationControl); without it
    // this custom control renders flush against the map edge.
    container.className =
      'mapboxgl-ctrl mr-3! mt-3! flex flex-col gap-1.5 rounded-md border border-line-strong bg-bg-raised p-1 shadow-(--shadow)';

    const makeButton = (
      label: string,
      ariaLabel: string,
      onClick: () => void,
    ) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.setAttribute('aria-label', ariaLabel);
      btn.className =
        'grid h-8 w-8 place-items-center rounded-[4px] font-mono text-sm text-ink-dim hover:text-ink hover:border-crimson';
      btn.addEventListener('click', onClick);
      return btn;
    };

    container.appendChild(makeButton('+', 'Zoom in', () => map.zoomIn()));
    container.appendChild(makeButton('−', 'Zoom out', () => map.zoomOut()));

    this.container = container;
    return container;
  }

  onRemove() {
    this.container?.remove();
  }
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const categoryStylesRef = useRef<Map<string, CategoryIconStyle>>(new Map());
  const filtersRef = useRef<Filters>({
    categoryIds: null,
    visited: null,
  });
  const refreshRef = useRef<() => void>(() => {});
  const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(0);
  const pendingCenterRef = useRef<[number, number] | null>(null);
  const addModeRef = useRef(false);
  const draftMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [basemapId, setBasemapId] = useState<BasemapId>(() =>
    loadStoredBasemapId(),
  );

  const searchParams = useSearchParams();
  const filters = parseFilters(searchParams);
  const filtersKey = JSON.stringify(filters);
  const { isPending: filtersPending } = useFilterTransition();
  const mapControls = useMapControls();
  // MapView fully unmounts/remounts between routes (they're separate
  // pages), so this is stable for the component's lifetime — same as
  // basemapId's "read once at mount" treatment.
  const isReviewQueue = usePathname() === '/review';

  const isCreating = searchParams.get('id') === 'new';
  const draftLat = searchParams.get('lat');
  const draftLon = searchParams.get('lon');

  function handleUseLocation() {
    setLocationError(null);
    setIsLocating(true);
    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't available in this browser.");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        mapRef.current?.easeTo({
          center: [longitude, latitude],
          zoom: Math.max(mapRef.current.getZoom(), 13),
          duration: 600,
        });
      },
      () => {
        setIsLocating(false);
        setLocationError('Location permission was denied.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleToggleBasemap() {
    const next = otherBasemapId(basemapId);
    mapRef.current?.setStyle(BASEMAPS[next].url);
    setBasemapId(next);
    saveBasemapId(next);
  }

  // Fetch categories once and (re)register their pin images whenever they
  // load, including after the map itself loads.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from('categories')
      .select('id, color, icon')
      .is('deleted_at', null)
      .then(async ({ data, error }) => {
        if (cancelled || error || !data) return;
        const styles = buildCategoryStyles(data);
        const map = mapRef.current;
        if (map) await registerCategoryIcons(map, styles);
        if (cancelled) return;
        categoryStylesRef.current = styles;
        if (map) {
          refreshRef.current();
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    let cancelled = false;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error('Missing NEXT_PUBLIC_MAPBOX_TOKEN environment variable.');
      return;
    }
    mapboxgl.accessToken = mapboxToken;

    // Read once on mount only, same as basemapId below — a URL-present
    // position takes priority over the last-viewed camera so shared/bookmarked
    // links land where they point rather than wherever the map was left.
    const initialView = parseInitialView(
      new URLSearchParams(window.location.search),
    );

    // Map construction is deferred until we know the initial center (see
    // below) — either the URL-specified view or, when none is present, the
    // outcome of a geolocation lookup — so the map never has to flash at the
    // fixed regional default and then jump to the user's actual location.
    function initMap(center: [number, number], zoom: number) {
      if (cancelled || !containerRef.current) return;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        // Read once on mount only — later switches go through setStyle(),
        // not a re-run of this effect (see the eslint-disable-next-line note
        // on this effect's dependency array below).
        style: BASEMAPS[basemapId].url,
        center,
        zoom,
        attributionControl: false,
      });
      mapRef.current = map;
      map.addControl(new ZoomControl(), 'top-right');
      // Freed up bottom-right (Mapbox's default attribution anchor) for
      // BasemapSwitcher by moving attribution to bottom-left instead.
      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        'bottom-left',
      );

      mapControls.register({
        refresh: () => refreshRef.current(),
        flyTo: (lngLat, options) =>
          map.easeTo({
            center: lngLat,
            zoom:
              options?.zoom != null
                ? Math.max(map.getZoom(), options.zoom)
                : map.getZoom(),
            duration: 600,
          }),
      });

      // mapbox-gl only calls resize() on window resize (trackResize), not on
      // container resize — the DetailDrawer opening/closing changes the map
      // container's width via flex layout without firing a window resize
      // event, so the canvas would otherwise keep rendering at its stale size.
      const resizeObserver = new ResizeObserver(() => {
        map.resize();
        if (pendingCenterRef.current) {
          map.easeTo({ center: pendingCenterRef.current, duration: 300 });
          pendingCenterRef.current = null;
        }
      });
      resizeObserver.observe(containerRef.current);
      resizeObserverRef.current = resizeObserver;

      const supabase = createClient();

      async function refresh() {
        // isStyleLoaded() is intentionally not part of this guard: refresh()
        // is called synchronously right after addSource() in the "load"
        // handler below, and the freshly-added source hasn't finished
        // loading yet at that point, so isStyleLoaded() would still read
        // false and silently skip the very first fetch (placemarks would
        // then only appear after a pan triggers moveend).
        if (!map.getSource(SOURCE_ID)) return;
        const bounds = map.getBounds();
        if (!bounds) return;
        const { categoryIds } = filtersRef.current;

        const requestId = ++requestIdRef.current;
        inFlightRef.current += 1;
        setIsFetching(true);

        const { data, error } = await supabase.rpc('placemarks_geojson', {
          in_west: bounds.getWest(),
          in_south: bounds.getSouth(),
          in_east: bounds.getEast(),
          in_north: bounds.getNorth(),
          in_category_ids: categoryIds,
          in_needs_review: isReviewQueue,
        });

        inFlightRef.current -= 1;
        if (inFlightRef.current === 0) setIsFetching(false);

        // A newer request superseded this one — don't let a slow, stale
        // response overwrite fresher data already on the map.
        if (requestId !== requestIdRef.current) return;

        if (error) {
          console.error(error);
          return;
        }

        const collection = data as PlacemarkCollection;
        const { visited } = filtersRef.current;
        const features = collection.features
          .filter((feature) => {
            if (visited !== null && feature.properties.visited !== visited)
              return false;
            return true;
          })
          .map((feature) => {
            const pinName = pinIconName(feature.properties.category_id);
            // The category's `icon` name might not resolve to a real
            // HugeIcons asset (fetch/rasterize can fail — e.g. stale/invalid
            // data), or the category's pin may not have registered yet; fall
            // back to the generic pin rather than pointing icon-image at a
            // name mapbox has never seen.
            const icon_image = map.hasImage(pinName)
              ? pinName
              : FALLBACK_PIN_NAME;
            return {
              ...feature,
              geometry: toPointGeometry(feature.geometry),
              // Supercluster (used internally by the clustered GeoJSON
              // source) does not preserve each leaf feature's top-level `id`
              // once features are clustered, so the click handler can't rely
              // on feature.id — mirror it into properties, which clustering
              // does preserve. icon_image is similarly precomputed here
              // (rather than as a mapbox style expression) since a category's
              // pin image may not be registered yet when this runs.
              properties: {
                ...feature.properties,
                id: feature.id as string,
                icon_image,
              },
            };
          });

        const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
        source.setData({ type: 'FeatureCollection', features });
      }
      refreshRef.current = refresh;

      // setStyle() (used by the basemap switcher) wipes every source/layer/
      // image not defined in the style itself and fires 'style.load' — unlike
      // 'load', which only ever fires once per Map instance. Everything that
      // setStyle destroys has to be re-added here so it reruns on every style
      // load, including the first.
      map.on('style.load', async () => {
        quietenBasemap(map);
        registerFallbackPin(map);

        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterMaxZoom: 10,
          clusterRadius: 25,
        });

        map.addLayer({
          id: CLUSTER_HALO_LAYER,
          type: 'circle',
          source: SOURCE_ID,
          filter: [
            'all',
            ['has', 'point_count'],
            ['>=', ['get', 'point_count'], LARGE_CLUSTER_THRESHOLD],
          ],
          paint: {
            'circle-radius': 36,
            'circle-color': cssVar('--crimson', '#d5202b'),
            'circle-opacity': 0.15,
          },
        });

        map.addLayer({
          id: CLUSTER_CIRCLE_LAYER,
          type: 'circle',
          source: SOURCE_ID,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': cssVar('--crimson', '#d5202b'),
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              17,
              25,
              22,
              LARGE_CLUSTER_THRESHOLD,
              29,
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': cssVar('--pin-stroke', '#0c0b09'),
          },
        });

        map.addLayer({
          id: CLUSTER_COUNT_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 11,
          },
          paint: {
            'text-color': cssVar('--on-crimson', '#fff8ea'),
          },
        });

        map.addLayer({
          id: POINT_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          filter: ['!', ['has', 'point_count']],
          layout: {
            // Precomputed per-feature in refresh() below, since a category's
            // pin image may not have finished registering when this runs.
            'icon-image': [
              'coalesce',
              ['get', 'icon_image'],
              FALLBACK_PIN_NAME,
            ],
            'icon-size': 1,
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            // Anchored 'top' with a downward offset so the label sits just
            // below the pin's tip (the feature point) without needing the
            // pin's pixel height — icon-anchor 'bottom' already renders the
            // icon upward from that same point.
            'text-field': ['get', 'name'],
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 11,
            'text-anchor': 'top',
            'text-offset': [0, 0.6],
            // Pins must always stay visible; let mapbox's built-in collision
            // detection hide only the text in crowded areas so labels thin
            // out gracefully instead of overlapping, at any zoom level.
            'text-allow-overlap': false,
            'text-optional': true,
          },
          paint: {
            'text-color': cssVar('--ink', '#f0e8d6'),
            'text-halo-color': cssVar('--pin-stroke', '#0c0b09'),
            'text-halo-width': 1,
          },
        });

        await registerCategoryIcons(map, categoryStylesRef.current);
        // setStyle() also clears the source's data along with the source
        // itself, so placemarks need re-fetching on every style load, not
        // just the first.
        refresh();
      });

      map.on('load', () => {
        setMapLoaded(true);

        // Delegated listeners below are keyed by layer-id string on the
        // Map/Style instance, not bound to the layer object — they survive
        // setStyle() and re-apply automatically once a layer with the same id
        // is re-added by the 'style.load' handler above. 'load' only ever
        // fires once per Map instance, so registering them here (rather than
        // in 'style.load') is what keeps them from stacking duplicates on
        // every basemap switch.

        // In add-mode, hovering an existing pin/cluster doesn't lead anywhere
        // (the click handler below bails on hits), so the cursor should stay
        // crosshair instead of flipping to pointer and back.
        map.on(
          'mouseenter',
          CLUSTER_CIRCLE_LAYER,
          () =>
            (map.getCanvas().style.cursor = addModeRef.current
              ? 'crosshair'
              : 'pointer'),
        );
        map.on(
          'mouseleave',
          CLUSTER_CIRCLE_LAYER,
          () =>
            (map.getCanvas().style.cursor = addModeRef.current
              ? 'crosshair'
              : ''),
        );
        map.on(
          'mouseenter',
          POINT_LAYER,
          () =>
            (map.getCanvas().style.cursor = addModeRef.current
              ? 'crosshair'
              : 'pointer'),
        );
        map.on(
          'mouseleave',
          POINT_LAYER,
          () =>
            (map.getCanvas().style.cursor = addModeRef.current
              ? 'crosshair'
              : ''),
        );

        map.on('click', CLUSTER_CIRCLE_LAYER, (event) => {
          const [feature] = map.queryRenderedFeatures(event.point, {
            layers: [CLUSTER_CIRCLE_LAYER],
          });
          const clusterId = feature?.properties?.cluster_id;

          if (
            clusterId == null ||
            !feature ||
            feature.geometry.type !== 'Point'
          )
            return;

          const center = feature.geometry.coordinates as [number, number];
          const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;

          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || zoom == null) return;
            map.easeTo({ center, zoom });
          });
        });

        map.on('click', POINT_LAYER, (event) => {
          const [feature] = map.queryRenderedFeatures(event.point, {
            layers: [POINT_LAYER],
          });
          const id = feature?.properties?.id ?? feature?.id;
          if (id == null) return;
          // Opening the drawer shrinks the map container (see the
          // ResizeObserver above), which re-centers the viewport around its
          // old center in the new, narrower canvas — re-queue the clicked
          // placemark's coordinates so it ends up centered in that view
          // instead of drifting toward the edge.
          if (feature?.geometry.type === 'Point') {
            pendingCenterRef.current = feature.geometry.coordinates as [
              number,
              number,
            ];
          }
          const params = new URLSearchParams(window.location.search);
          params.set('id', String(id));
          // Plain router.push() here round-trips through the server (this
          // route reads cookies, so it's fully dynamic) and, per
          // node_modules/next/dist/docs/01-app/02-guides/single-page-applications.md
          // ("Shallow routing on the client"), that RSC round-trip can resolve
          // without ever committing the URL/search-param change for
          // same-page navigations. Opening/closing the detail pane is pure
          // client state, so use the documented shallow-routing escape hatch
          // (history.pushState, which Next's router patches to stay in sync
          // with useSearchParams) instead of router.push().
          window.history.pushState(null, '', `?${params.toString()}`);
        });

        // Generic background click for add-mode — registered separately from
        // the layer-scoped handlers above since it must fire on empty map
        // area, not a specific layer. Bails if the click actually hit an
        // existing point or cluster so clicking a pin still opens its detail
        // instead of creating a duplicate underneath it.
        map.on('click', (event) => {
          if (!addModeRef.current) return;
          const hits = map.queryRenderedFeatures(event.point, {
            layers: [POINT_LAYER, CLUSTER_CIRCLE_LAYER],
          });
          if (hits.length > 0) return;
          addModeRef.current = false;
          setAddMode(false);
          map.getCanvas().style.cursor = '';
          openCreatePanel(event.lngLat.lat, event.lngLat.lng);
        });
      });

      map.on('moveend', () => {
        updateViewParams(map);
        if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
        moveTimeoutRef.current = setTimeout(() => refreshRef.current(), 300);
      });
    }

    // A URL-specified view wins immediately. Otherwise, wait to learn
    // whether geolocation succeeds before constructing the map at all, and
    // seed it directly at the resolved center — the user's actual location,
    // or the regional default on failure/denial/unavailability. This is
    // silent (no toast, no locationError) since it's automatic rather than a
    // response to a click.
    if (initialView) {
      initMap(initialView.center, initialView.zoom);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          initMap([longitude, latitude], 13);
        },
        () => {
          initMap(DEFAULT_CENTER, DEFAULT_ZOOM);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } else {
      initMap(DEFAULT_CENTER, DEFAULT_ZOOM);
    }

    return () => {
      cancelled = true;

      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);

      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      draftMarkerRef.current?.remove();
      draftMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // mapControls is read once to register this map instance's refresh/flyTo
    // into the shared context; it doesn't need to retrigger this effect.
    // basemapId is also intentionally read once, only to seed the initial
    // style — later switches go through map.setStyle() (handleToggleBasemap)
    // rather than tearing down and recreating the whole map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cursor and click-handler both need the latest add-mode without
  // re-registering the click listener (which is bound once above) — same
  // ref-mirroring pattern as filtersRef below.
  useEffect(() => {
    addModeRef.current = addMode;
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = addMode ? 'crosshair' : '';
    }
  }, [addMode]);

  // Show a draggable marker at the pending create location so the user can
  // see and fine-tune the pin's position while the "new placemark" form is
  // open, instead of only finding out where it landed after saving.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (isCreating && draftLat && draftLon) {
      const lngLat: [number, number] = [Number(draftLon), Number(draftLat)];
      if (!draftMarkerRef.current) {
        draftMarkerRef.current = new mapboxgl.Marker({
          color: cssVar('--crimson', '#d5202b'),
          draggable: true,
        })
          .setLngLat(lngLat)
          .addTo(map);
        draftMarkerRef.current.on('dragend', () => {
          const pos = draftMarkerRef.current!.getLngLat();
          const params = new URLSearchParams(window.location.search);
          params.set('lat', String(pos.lat));
          params.set('lon', String(pos.lng));
          window.history.pushState(null, '', `?${params.toString()}`);
        });
      } else {
        draftMarkerRef.current.setLngLat(lngLat);
      }
    } else if (draftMarkerRef.current) {
      draftMarkerRef.current.remove();
      draftMarkerRef.current = null;
    }
  }, [isCreating, draftLat, draftLon, mapLoaded]);

  // Keep the ref in sync and re-fetch whenever the URL-derived filters
  // change. filtersRef exists because map event handlers (click, moveend)
  // are registered once and need the latest filters outside React's render
  // cycle, not because this effect can't read `filters` directly.
  useEffect(() => {
    filtersRef.current = filters;
    refreshRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  return (
    <>
      <div ref={containerRef} className="h-full w-full" />
      {mapLoaded && !isReviewQueue && (
        <AddPlacemarkToolbar
          addMode={addMode}
          onToggleAddMode={() => setAddMode((v) => !v)}
          onUseLocation={handleUseLocation}
          locationError={locationError}
          isLocating={isLocating}
        />
      )}
      {mapLoaded && (
        <BasemapSwitcher
          activeBasemapId={basemapId}
          onToggle={handleToggleBasemap}
        />
      )}
      {!mapLoaded && <MapLoadingOverlay />}
      {mapLoaded && (filtersPending || isFetching || isLocating) && (
        <MapLoadingOverlay dim />
      )}
    </>
  );
}
