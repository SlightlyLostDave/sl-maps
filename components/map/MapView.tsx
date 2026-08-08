"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createClient } from "@/lib/supabase/client";
import {
  assignCategoryShapes,
  FALLBACK_CATEGORY_COLOR,
  type CategoryStyle,
} from "@/lib/map/categoryStyle";
import { iconName, registerShapeIcons } from "@/lib/map/shapeIcons";
import MapLoadingOverlay from "./MapLoadingOverlay";
import Spinner from "@/components/ui/Spinner";

const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";
const SOURCE_ID = "placemarks";
const CLUSTER_HALO_LAYER = "placemarks-cluster-halo";
const CLUSTER_CIRCLE_LAYER = "placemarks-cluster-circle";
const CLUSTER_COUNT_LAYER = "placemarks-cluster-count";
const POINT_LAYER = "placemarks-point";
const LARGE_CLUSTER_THRESHOLD = 100;

type PlacemarkFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  {
    name: string;
    category_id: string;
    priority: number | null;
    visited: boolean;
    want_to_go: boolean;
    tags: string;
  }
>;
type PlacemarkCollection = GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  PlacemarkFeature["properties"]
>;

type Filters = {
  categoryIds: string[] | null;
  visited: boolean | null;
  wantToGo: boolean;
};

function parseFilters(params: URLSearchParams): Filters {
  const catParam = params.get("cat");
  const categoryIds = catParam ? catParam.split(",").filter(Boolean) : null;
  const visitedParam = params.get("visited");
  const visited = visitedParam === "1" ? true : visitedParam === "0" ? false : null;
  const wantToGo = params.get("want_to_go") === "1";
  return { categoryIds, visited, wantToGo };
}

// The QGIS import backlog (sql/0001_placemarks_needs_review.sql) left some
// placemarks stored as single-coordinate MultiPoint geometry. Mapbox's
// clustered GeoJSON source only indexes Point features via Supercluster —
// a MultiPoint mixed into the collection silently breaks clustering for the
// whole source (no error event, tiles just come back empty), which is what
// made pins vanish after panning into an area containing one.
function toPointGeometry(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geometry.type === "MultiPoint") {
    return { type: "Point", coordinates: geometry.coordinates[0] };
  }
  return geometry;
}

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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
      if (id.includes("poi")) {
        map.setLayoutProperty(layer.id, "visibility", "none");
      } else if (id.includes("road") && layer.type === "line") {
        map.setPaintProperty(layer.id, "line-opacity", 0.35);
      }
    } catch {
      // Style layer ids can shift between Mapbox style versions; skip
      // whatever this version doesn't have rather than failing map load.
    }
  }

  if (map.getLayer("water")) {
    map.setPaintProperty("water", "fill-color", cssVar("--map-water", "#14211f"));
  }
}

function buildCategoryExpressions(styles: Map<string, CategoryStyle>) {
  const iconImagePairs: string[] = [];
  const iconColorPairs: string[] = [];
  for (const [id, style] of styles) {
    iconImagePairs.push(id, iconName(style.shape));
    iconColorPairs.push(id, style.color);
  }
  return {
    iconImageExpr: ["match", ["get", "category_id"], ...iconImagePairs, iconName("circle")],
    iconColorExpr: ["match", ["get", "category_id"], ...iconColorPairs, FALLBACK_CATEGORY_COLOR],
  } as const;
}

function applyCategoryExpressions(map: mapboxgl.Map, styles: Map<string, CategoryStyle>) {
  if (styles.size === 0 || !map.getLayer(POINT_LAYER)) return;
  const { iconImageExpr, iconColorExpr } = buildCategoryExpressions(styles);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map.setLayoutProperty(POINT_LAYER, "icon-image", iconImageExpr as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map.setPaintProperty(POINT_LAYER, "icon-color", iconColorExpr as any);
}

class ZoomControl implements mapboxgl.IControl {
  private container?: HTMLDivElement;

  onAdd(map: mapboxgl.Map) {
    const container = document.createElement("div");
    container.className =
      "flex flex-col gap-1.5 rounded-md border border-line-strong bg-bg-raised p-1 shadow-(--shadow)";

    const makeButton = (label: string, ariaLabel: string, onClick: () => void) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.setAttribute("aria-label", ariaLabel);
      btn.className =
        "grid h-8 w-8 place-items-center rounded-[4px] font-mono text-sm text-ink-dim hover:text-ink hover:border-crimson";
      btn.addEventListener("click", onClick);
      return btn;
    };

    container.appendChild(makeButton("+", "Zoom in", () => map.zoomIn()));
    container.appendChild(makeButton("−", "Zoom out", () => map.zoomOut()));

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
  const categoryStylesRef = useRef<Map<string, CategoryStyle>>(new Map());
  const filtersRef = useRef<Filters>({ categoryIds: null, visited: null, wantToGo: false });
  const refreshRef = useRef<() => void>(() => {});
  const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(0);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseFilters(searchParams);
  const filtersKey = JSON.stringify(filters);

  // Fetch categories once and (re)apply the icon-image / icon-color match
  // expressions whenever they load, including after the map itself loads.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("categories")
      .select("id, color, sort_order")
      .is("deleted_at", null)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        categoryStylesRef.current = assignCategoryShapes(data);
        if (mapRef.current) applyCategoryExpressions(mapRef.current, categoryStylesRef.current);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN environment variable.");
      return;
    }
    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-80.5, 44.5],
      zoom: 6,
    });
    mapRef.current = map;
    map.addControl(new ZoomControl(), "top-right");

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

      const { data, error } = await supabase.rpc("placemarks_geojson", {
        in_west: bounds.getWest(),
        in_south: bounds.getSouth(),
        in_east: bounds.getEast(),
        in_north: bounds.getNorth(),
        in_category_ids: categoryIds,
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
      const { visited, wantToGo } = filtersRef.current;
      const features = collection.features
        .filter((feature) => {
          if (visited !== null && feature.properties.visited !== visited) return false;
          if (wantToGo && !feature.properties.want_to_go) return false;
          return true;
        })
        .map((feature) => ({ ...feature, geometry: toPointGeometry(feature.geometry) }));

      const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      source.setData({ type: "FeatureCollection", features });
    }
    refreshRef.current = refresh;

    map.on("load", () => {
      setMapLoaded(true);
      quietenBasemap(map);
      registerShapeIcons(map);

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 50,
      });

      map.addLayer({
        id: CLUSTER_HALO_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["all", ["has", "point_count"], [">=", ["get", "point_count"], LARGE_CLUSTER_THRESHOLD]],
        paint: {
          "circle-radius": 36,
          "circle-color": cssVar("--crimson", "#d5202b"),
          "circle-opacity": 0.15,
        },
      });

      map.addLayer({
        id: CLUSTER_CIRCLE_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": cssVar("--crimson", "#d5202b"),
          "circle-radius": ["step", ["get", "point_count"], 17, 25, 22, LARGE_CLUSTER_THRESHOLD, 29],
          "circle-stroke-width": 2,
          "circle-stroke-color": cssVar("--pin-stroke", "#0c0b09"),
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 11,
        },
        paint: {
          "text-color": cssVar("--on-crimson", "#fff8ea"),
        },
      });

      map.addLayer({
        id: POINT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": iconName("circle"),
          "icon-size": 0.5,
          "icon-allow-overlap": true,
        },
        paint: {
          "icon-color": FALLBACK_CATEGORY_COLOR,
          "icon-halo-color": cssVar("--pin-stroke", "#0c0b09"),
          "icon-halo-width": 1.5,
        },
      });

      applyCategoryExpressions(map, categoryStylesRef.current);

      map.on("mouseenter", CLUSTER_CIRCLE_LAYER, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", CLUSTER_CIRCLE_LAYER, () => (map.getCanvas().style.cursor = ""));
      map.on("mouseenter", POINT_LAYER, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", POINT_LAYER, () => (map.getCanvas().style.cursor = ""));

      map.on("click", CLUSTER_CIRCLE_LAYER, (event) => {
        const [feature] = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_CIRCLE_LAYER] });
        const clusterId = feature?.properties?.cluster_id;
        if (clusterId == null || !feature || feature.geometry.type !== "Point") return;
        const center = feature.geometry.coordinates as [number, number];
        const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          map.easeTo({ center, zoom });
        });
      });

      map.on("click", POINT_LAYER, (event) => {
        const [feature] = map.queryRenderedFeatures(event.point, { layers: [POINT_LAYER] });
        const id = feature?.id ?? feature?.properties?.id;
        if (id == null) return;
        const params = new URLSearchParams(window.location.search);
        params.set("id", String(id));
        router.push(`?${params.toString()}`, { scroll: false });
      });

      refresh();
    });

    map.on("moveend", () => {
      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
      moveTimeoutRef.current = setTimeout(() => refreshRef.current(), 300);
    });

    return () => {
      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {!mapLoaded && <MapLoadingOverlay />}
      {mapLoaded && isFetching && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full border border-line-strong bg-bg-raised px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-dim shadow-(--shadow)">
          <Spinner size="xs" />
          Updating
        </div>
      )}
    </>
  );
}
