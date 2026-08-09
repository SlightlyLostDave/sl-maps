"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";

type MapControls = {
  refresh: () => void;
  flyTo: (lngLat: [number, number]) => void;
};

type MapControlsRegistry = MapControls & {
  register: (controls: MapControls) => void;
};

const noop = () => {};

const MapControlsContext = createContext<MapControlsRegistry | null>(null);

// MapView owns the actual mapbox-gl instance and keeps it private; this
// registers a ref-backed indirection so sibling components (the add-mode
// toolbar, the create/edit form) can trigger a refresh or fly-to without
// MapView needing to expose its map ref directly. Mirrors the ref-backed
// pattern refreshRef already uses inside MapView itself.
export function MapControlsProvider({ children }: { children: ReactNode }) {
  const controlsRef = useRef<MapControls>({ refresh: noop, flyTo: noop });

  const value: MapControlsRegistry = {
    refresh: () => controlsRef.current.refresh(),
    flyTo: (lngLat) => controlsRef.current.flyTo(lngLat),
    register: (controls) => {
      controlsRef.current = controls;
    },
  };

  return <MapControlsContext.Provider value={value}>{children}</MapControlsContext.Provider>;
}

export function useMapControls() {
  const context = useContext(MapControlsContext);
  if (!context) throw new Error("useMapControls must be used within a MapControlsProvider");
  return context;
}
