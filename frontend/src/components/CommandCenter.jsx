/**
 * CommandCenter — rebuilt.
 * Clean MapLibre map + OrbeoCommand integration.
 * The map handles all data layers; OrbeoCommand handles all UX.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import OrbeoCommand from "@/components/OrbeoCommand";
import { STYLES } from "@/lib/mapStyles";
import {
  fetchEvents, fetchParking, geocode, fetchRoute,
  azureTileUrl, fetchMobilityStations,
} from "@/lib/api";

// ─── Severity colour ──────────────────────────────────────────────────────
const SEV = {
  critical: "#f87171",
  warning:  "#fb923c",
  info:     "#22d3ee",
};
const KIND_GLYPH = {
  obras:      "⚠",
  accidente:  "✕",
  congestion: "≋",
  peligro:    "▲",
  meteo:      "☁",
  incidencia: "i",
};

// ─── Map source/layer IDs ────────────────────────────────────────────────
const SRC_EVENTS   = "orbeo-events";
const LYR_CIRCLES  = "orbeo-event-circles";
const LYR_TEXT     = "orbeo-event-text";
const SRC_ROUTE    = "orbeo-route";
const LYR_ROUTE    = "orbeo-route-line";
const SRC_PARKING  = "orbeo-parking";
const LYR_PARKING  = "orbeo-parking-circles";

// ─── Pin helper ───────────────────────────────────────────────────────────
function makePinEl(label, color) {
  const el = document.createElement("div");
  el.style.cssText = `
    width:36px; height:44px; cursor:default; pointer-events:none;
  `;
  el.innerHTML = `
    <svg viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <path d="M18 2C10.28 2 4 8.28 4 16c0 10.5 14 26 14 26s14-15.5 14-26c0-7.72-6.28-14-14-14z"
            fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="18" cy="16" r="7" fill="#fff"/>
      <text x="18" y="20" text-anchor="middle" font-size="9" font-weight="bold"
            font-family="monospace" fill="${color}">${label}</text>
    </svg>
  `;
  return el;
}

// ─── Component ───────────────────────────────────────────────────────────
export default function CommandCenter() {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const originMarker = useRef(null);
  const destMarker   = useRef(null);
  const mapReady     = useRef(false);

  const [mapStyle,     setMapStyle]     = useState("normal");
  const [origin,       setOrigin]       = useState("");
  const [destination,  setDestination]  = useState("");
  const [transport,    setTransport]    = useState("car");
  const [mapClickLoc,  setMapClickLoc]  = useState(null);
  const [pendingField, setPendingField] = useState(null); // "origin"|"destination"
  const [routeResult,  setRouteResult]  = useState(null);
  const [eventsData,   setEventsData]   = useState(null);

  // ── Init map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLES[mapStyle]?.style || STYLES.normal.style,
      center: [-3.7038, 40.4168],
      zoom: 12,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => {
      mapReady.current = true;

      // Events source + layers
      map.addSource(SRC_EVENTS, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: LYR_CIRCLES,
        type: "circle",
        source: SRC_EVENTS,
        paint: {
          "circle-radius": 9,
          "circle-color": [
            "match", ["get", "severity"],
            "critical", SEV.critical,
            "warning",  SEV.warning,
            SEV.info,
          ],
          "circle-opacity": 0.9,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#020a14",
        },
      });
      map.addLayer({
        id: LYR_TEXT,
        type: "symbol",
        source: SRC_EVENTS,
        layout: {
          "text-field": ["get", "glyph"],
          "text-size": 10,
          "text-font": ["Noto Sans Regular"],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-anchor": "center",
        },
        paint: { "text-color": "#020a14" },
      });

      // Route source + layer
      map.addSource(SRC_ROUTE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: LYR_ROUTE,
        type: "line",
        source: SRC_ROUTE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#22d3ee",
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });

      // Parking source + layer
      map.addSource(SRC_PARKING, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: LYR_PARKING,
        type: "circle",
        source: SRC_PARKING,
        paint: {
          "circle-radius": 7,
          "circle-color": "#a78bfa",
          "circle-opacity": 0.85,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#020a14",
        },
      });

      // Click handler — forward to OrbeoCommand
      map.on("click", async (e) => {
        const { lng, lat } = e.lngLat;
        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const r = await geocode(`${lat},${lng}`);
          if (r?.display_name) address = r.display_name;
        } catch {}
        setMapClickLoc({ lat, lon: lng, address });
      });

      // Load initial events
      loadEvents(map);
    });

    return () => { map.remove(); mapRef.current = null; mapReady.current = false; };
  }, []);

  // ── Style switch ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady.current) return;
    map.setStyle(STYLES[mapStyle]?.style || STYLES.normal.style);
    map.once("styledata", () => loadEvents(map));
  }, [mapStyle]);

  // ── Load events ───────────────────────────────────────────────────────
  const loadEvents = useCallback(async (map) => {
    try {
      const c = map.getCenter();
      const data = await fetchEvents("madrid", c.lat, c.lng, 150);
      const features = (data?.features || []).map(f => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [f.lon, f.lat] },
        properties: {
          id: f.id,
          severity: f.severity,
          title: f.title,
          description: f.description,
          glyph: KIND_GLYPH[f.kind] || "i",
        },
      }));
      const src = map.getSource(SRC_EVENTS);
      if (src) src.setData({ type: "FeatureCollection", features });
    } catch (e) { console.warn("Events load failed:", e); }
  }, []);

  // ── Origin / Destination ──────────────────────────────────────────────
  const handleOriginChange = useCallback(async (address) => {
    setOrigin(address);
    if (!address) { originMarker.current?.remove(); originMarker.current = null; return; }
    try {
      const r = await geocode(address);
      if (!r?.lat) return;
      const map = mapRef.current;
      originMarker.current?.remove();
      originMarker.current = new maplibregl.Marker({ element: makePinEl("A", "#4ade80"), anchor: "bottom" })
        .setLngLat([r.lon, r.lat]).addTo(map);
      map.flyTo({ center: [r.lon, r.lat], zoom: 13, duration: 1200 });
    } catch {}
  }, []);

  const handleDestinationChange = useCallback(async (address) => {
    setDestination(address);
    if (!address) { destMarker.current?.remove(); destMarker.current = null; return; }
    try {
      const r = await geocode(address);
      if (!r?.lat) return;
      const map = mapRef.current;
      destMarker.current?.remove();
      destMarker.current = new maplibregl.Marker({ element: makePinEl("B", "#f87171"), anchor: "bottom" })
        .setLngLat([r.lon, r.lat]).addTo(map);
      map.flyTo({ center: [r.lon, r.lat], zoom: 13, duration: 1200 });
    } catch {}
  }, []);

  // ── Compute route ─────────────────────────────────────────────────────
  const handleCompute = useCallback(async () => {
    if (!origin || !destination) return;
    try {
      const result = await fetchRoute(origin, destination, transport);
      setRouteResult(result);
      const map = mapRef.current;
      const src = map.getSource(SRC_ROUTE);
      if (src && result?.geometry) {
        src.setData({ type: "FeatureCollection", features: [{ type: "Feature", geometry: result.geometry, properties: {} }] });
        // Fit bounds
        const coords = result.geometry.coordinates;
        if (coords?.length > 0) {
          const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
          map.fitBounds(bounds, { padding: 80, duration: 1400 });
        }
      }
    } catch (e) { console.warn("Route failed:", e); }
  }, [origin, destination, transport]);

  // ── Toggle layers ─────────────────────────────────────────────────────
  const handleToggleLayer = useCallback(async (layer, on) => {
    const map = mapRef.current;
    if (!map || !mapReady.current) return;
    if (layer === "traffic_flow" || layer === "traffic_incidents") {
      const tileSrc = layer === "traffic_flow" ? "azure-flow" : "azure-incidents";
      const tileUrl = azureTileUrl(layer === "traffic_flow" ? "flow" : "incident");
      if (on) {
        if (!map.getSource(tileSrc)) {
          map.addSource(tileSrc, { type: "raster", tiles: [tileUrl], tileSize: 256 });
          map.addLayer({ id: tileSrc, type: "raster", source: tileSrc, paint: { "raster-opacity": 0.7 } });
        }
      } else {
        if (map.getLayer(tileSrc)) map.removeLayer(tileSrc);
        if (map.getSource(tileSrc)) map.removeSource(tileSrc);
      }
    } else if (layer === "parking") {
      if (on) {
        const c = map.getCenter();
        const data = await fetchParking(c.lat, c.lng, 2000);
        const features = (data?.features || []).map(f => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [f.lon, f.lat] },
          properties: { name: f.name },
        }));
        const src = map.getSource(SRC_PARKING);
        if (src) src.setData({ type: "FeatureCollection", features });
      } else {
        const src = map.getSource(SRC_PARKING);
        if (src) src.setData({ type: "FeatureCollection", features: [] });
      }
    } else if (layer === "bikes") {
      // handled via mobility stations
      const c = map.getCenter();
      if (on) {
        try {
          const data = await fetchMobilityStations(c.lat, c.lng, 3.0, "ES");
          // Could render as custom markers — for now just log
          console.log("Bike stations:", data?.count);
        } catch {}
      }
    }
  }, []);

  // ── Locate me ─────────────────────────────────────────────────────────
  const handleLocateMe = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      mapRef.current?.flyTo({ center: [lon, lat], zoom: 15, duration: 1200 });
    });
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#020a14", overflow: "hidden" }}>
      {/* Map */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Orb UI */}
      <OrbeoCommand
        origin={origin}
        destination={destination}
        onOriginChange={handleOriginChange}
        onDestinationChange={handleDestinationChange}
        onCompute={handleCompute}
        onToggleLayer={handleToggleLayer}
        onLocateMe={handleLocateMe}
        onTransportChange={setTransport}
        transportMode={transport}
        mapClickLatLon={mapClickLoc}
      />

      {/* Route info pill */}
      {routeResult && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: "rgba(2,16,34,0.92)",
          border: "1px solid rgba(34,211,238,0.3)",
          borderRadius: 30, padding: "8px 20px",
          fontFamily: "monospace", fontSize: 11, color: "#22d3ee",
          letterSpacing: "0.15em", backdropFilter: "blur(12px)",
          zIndex: 60, display: "flex", gap: 20, alignItems: "center",
        }}>
          <span>📍 {routeResult.distance_km} km</span>
          <span>⏱ {routeResult.duration_min} min</span>
          <span style={{ color: "#4ade80" }}>🌿 {routeResult.co2_g}g CO₂</span>
          <button onClick={() => {
            setRouteResult(null);
            mapRef.current?.getSource(SRC_ROUTE)?.setData({ type: "FeatureCollection", features: [] });
          }} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", marginLeft: 4 }}>✕</button>
        </div>
      )}
    </div>
  );
}
