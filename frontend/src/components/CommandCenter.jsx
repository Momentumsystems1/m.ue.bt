/**
 * CommandCenter v2 — mapa limpio + OrbeoCommand v2
 * • MapLibre GL con eventos DGT como GeoJSON (círculos fijos, no se mueven con zoom)
 * • Pins SVG para origen / destino
 * • Ruta calculada dibujada como línea
 * • Parking y tráfico como capas conmutables
 * • Click en mapa → pasa coordenada al orbe para geocodificación
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import OrbeoCommand from "@/components/OrbeoCommand";
import { STYLES } from "@/lib/mapStyles";
import { fetchEvents, fetchParking, geocode, fetchRoute, azureTileUrl } from "@/lib/api";

// ── Constants ──────────────────────────────────────────────────────────────────
const SEV_COLOR = { critical: "#f87171", warning: "#fb923c", info: "#22d3ee" };
const KIND_GLYPH = {
  obras:"⚠", accidente:"✕", congestion:"≋", peligro:"▲", meteo:"☁", incidencia:"i",
};

const SRC_EVENTS  = "orbeo-events";
const LYR_CIRC    = "orbeo-ev-circ";
const LYR_TXT     = "orbeo-ev-txt";
const SRC_ROUTE   = "orbeo-route";
const LYR_ROUTE   = "orbeo-route-line";
const LYR_ROUTE_B = "orbeo-route-border";
const SRC_PARK    = "orbeo-parking";
const LYR_PARK    = "orbeo-park-circ";
const SRC_AZ_FLOW = "az-flow";
const SRC_AZ_INC  = "az-inc";

// ── Pin element helper ─────────────────────────────────────────────────────────
function makePinEl(label, color) {
  const el = document.createElement("div");
  el.style.cssText = "width:36px;height:44px;pointer-events:none;";
  el.innerHTML = `<svg viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg"
    style="width:100%;height:100%;filter:drop-shadow(0 2px 6px ${color}88)">
    <path d="M18 2C10.28 2 4 8.28 4 16c0 10.5 14 26 14 26s14-15.5 14-26C32 8.28 25.72 2 18 2z"
      fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="18" cy="16" r="7" fill="rgba(255,255,255,0.9)"/>
    <text x="18" y="20" text-anchor="middle" font-size="9" font-weight="700"
      font-family="monospace" fill="${color}">${label}</text>
  </svg>`;
  return el;
}

// ── Helper: add/remove Azure raster layer safely ───────────────────────────────
function setAzureLayer(map, srcId, lyrId, tileUrl, visible) {
  if (visible) {
    if (!map.getSource(srcId)) {
      map.addSource(srcId, { type:"raster", tiles:[tileUrl], tileSize:256 });
      map.addLayer({ id:lyrId, type:"raster", source:srcId,
        paint:{ "raster-opacity":0.7 } });
    }
  } else {
    if (map.getLayer(lyrId))  map.removeLayer(lyrId);
    if (map.getSource(srcId)) map.removeSource(srcId);
  }
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function CommandCenter() {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const mapReady     = useRef(false);
  const originMkr    = useRef(null);
  const destMkr      = useRef(null);

  const [mapStyle,    setMapStyle]    = useState("normal");
  const [origin,      setOrigin]      = useState("");
  const [destination, setDestination] = useState("");
  const [transport,   setTransport]   = useState("car");
  const [routeInfo,   setRouteInfo]   = useState(null);
  const [mapClick,    setMapClick]    = useState(null);

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLES.normal.style,
      center: [-3.7038, 40.4168],
      zoom: 12,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => {
      mapReady.current = true;

      // ── Events layer ──────────────────────────────────────────────
      map.addSource(SRC_EVENTS, {
        type: "geojson",
        data: { type:"FeatureCollection", features:[] },
      });
      map.addLayer({
        id: LYR_CIRC, type:"circle", source:SRC_EVENTS,
        paint: {
          "circle-radius": 9,
          "circle-color": ["match",["get","severity"],
            "critical",SEV_COLOR.critical,
            "warning", SEV_COLOR.warning,
            SEV_COLOR.info],
          "circle-opacity": 0.92,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#020a14",
        },
      });
      map.addLayer({
        id: LYR_TXT, type:"symbol", source:SRC_EVENTS,
        layout: {
          "text-field": ["get","glyph"],
          "text-size": 10,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-anchor": "center",
        },
        paint: { "text-color": "#020a14" },
      });

      // ── Route layers ──────────────────────────────────────────────
      map.addSource(SRC_ROUTE, {
        type:"geojson", data:{ type:"FeatureCollection", features:[] },
      });
      // Border (shadow)
      map.addLayer({
        id: LYR_ROUTE_B, type:"line", source:SRC_ROUTE,
        layout:{ "line-cap":"round","line-join":"round" },
        paint:{ "line-color":"#020a14","line-width":8,"line-opacity":0.5 },
      });
      // Main line
      map.addLayer({
        id: LYR_ROUTE, type:"line", source:SRC_ROUTE,
        layout:{ "line-cap":"round","line-join":"round" },
        paint:{
          "line-color":"#22d3ee","line-width":4,"line-opacity":0.9,
          "line-dasharray": [1,0],
        },
      });

      // ── Parking layer ─────────────────────────────────────────────
      map.addSource(SRC_PARK, {
        type:"geojson", data:{ type:"FeatureCollection", features:[] },
      });
      map.addLayer({
        id: LYR_PARK, type:"circle", source:SRC_PARK,
        paint:{
          "circle-radius":7,"circle-color":"#a78bfa",
          "circle-opacity":0.88,"circle-stroke-width":1,
          "circle-stroke-color":"#020a14",
        },
      });

      // Popup on event click
      map.on("click", LYR_CIRC, (e) => {
        const p = e.features[0]?.properties;
        if (!p) return;
        new maplibregl.Popup({ offset:12, className:"orbeo-popup" })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-family:monospace;font-size:11px;color:#e2e8f0;padding:4px 2px">
            <b style="color:#fb923c">${p.severity?.toUpperCase()||"INFO"}</b><br/>
            ${p.title||""}<br/>
            <span style="color:#64748b;font-size:10px">${(p.description||"").slice(0,80)}</span>
          </div>`)
          .addTo(map);
      });
      map.on("mouseenter", LYR_CIRC, () => { map.getCanvas().style.cursor="pointer"; });
      map.on("mouseleave", LYR_CIRC, () => { map.getCanvas().style.cursor=""; });

      // Map click → forward to OrbeoCommand
      map.on("click", async (e) => {
        // Skip if clicked on event circle (handled above)
        const features = map.queryRenderedFeatures(e.point, { layers:[LYR_CIRC] });
        if (features.length > 0) return;
        const { lng, lat } = e.lngLat;
        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const r = await geocode(`${lat},${lng}`);
          if (r?.display_name) address = r.display_name;
        } catch {}
        setMapClick({ lat, lon: lng, address });
      });

      // Load initial events
      loadEvents(map, 40.4168, -3.7038);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapReady.current = false;
    };
  }, []);

  // ── Load events ──────────────────────────────────────────────────────────
  const loadEvents = useCallback(async (map, lat, lon) => {
    try {
      const data = await fetchEvents("madrid", lat, lon, 150);
      const features = (data?.features || []).map(f => ({
        type:"Feature",
        geometry:{ type:"Point", coordinates:[f.lon, f.lat] },
        properties:{
          severity: f.severity,
          title: f.title,
          description: f.description,
          glyph: KIND_GLYPH[f.kind] || "i",
        },
      }));
      const src = map.getSource(SRC_EVENTS);
      if (src) src.setData({ type:"FeatureCollection", features });
    } catch(e) { console.warn("Events:", e); }
  }, []);

  // ── Geocode + place pin ───────────────────────────────────────────────────
  async function geocodeAndPin(address, markerRef, color, label) {
    if (!address) { markerRef.current?.remove(); markerRef.current = null; return null; }
    const map = mapRef.current;
    if (!map) return null;
    // Try as "lat,lon" first
    const latlon = address.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    let lat, lon, displayName = address;
    if (latlon) {
      lat = parseFloat(latlon[1]); lon = parseFloat(latlon[2]);
    } else {
      try {
        const r = await geocode(address);
        if (!r?.lat) return null;
        lat = r.lat; lon = r.lon;
        displayName = r.display_name || address;
      } catch { return null; }
    }
    markerRef.current?.remove();
    markerRef.current = new maplibregl.Marker({ element: makePinEl(label, color), anchor:"bottom" })
      .setLngLat([lon, lat]).addTo(map);
    return { lat, lon, display: displayName };
  }

  // ── Origin change ─────────────────────────────────────────────────────────
  const handleOriginChange = useCallback(async (address) => {
    setOrigin(address);
    await geocodeAndPin(address, originMkr, "#4ade80", "A");
    if (address && mapRef.current) {
      const r = await geocode(address).catch(() => null);
      if (r?.lat) mapRef.current.flyTo({ center:[r.lon, r.lat], zoom:13, duration:1200 });
    }
  }, []);

  // ── Destination change ────────────────────────────────────────────────────
  const handleDestinationChange = useCallback(async (address) => {
    setDestination(address);
    await geocodeAndPin(address, destMkr, "#f87171", "B");
    if (address && mapRef.current) {
      const r = await geocode(address).catch(() => null);
      if (r?.lat) mapRef.current.flyTo({ center:[r.lon, r.lat], zoom:13, duration:1200 });
    }
  }, []);

  // ── Compute route ─────────────────────────────────────────────────────────
  const handleCompute = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !origin || !destination) {
      alert("Primero define origen y destino");
      return;
    }
    try {
      // Resolve coordinates
      const fromLatlon = origin.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      const toLatlon   = destination.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);

      let fromStr, toStr;
      if (fromLatlon) {
        fromStr = `${fromLatlon[1]},${fromLatlon[2]}`;
      } else {
        const r = await geocode(origin);
        if (!r?.lat) { alert(`No se encontró: ${origin}`); return; }
        fromStr = `${r.lat},${r.lon}`;
      }
      if (toLatlon) {
        toStr = `${toLatlon[1]},${toLatlon[2]}`;
      } else {
        const r = await geocode(destination);
        if (!r?.lat) { alert(`No se encontró: ${destination}`); return; }
        toStr = `${r.lat},${r.lon}`;
      }

      const result = await fetchRoute(fromStr, toStr, transport);
      if (!result?.geometry) { console.warn("No geometry in route", result); return; }

      // Draw route
      const src = map.getSource(SRC_ROUTE);
      if (src) {
        src.setData({
          type:"FeatureCollection",
          features:[{ type:"Feature", geometry:result.geometry, properties:{} }],
        });
      }

      // Fit bounds
      const coords = result.geometry.coordinates || [];
      if (coords.length > 1) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        map.fitBounds(bounds, { padding:80, duration:1400 });
      }

      setRouteInfo({
        distance_km: result.distance_km,
        duration_min: result.duration_min,
        co2_g: result.co2_g,
        source: result.source,
      });
    } catch(e) {
      console.error("Route error:", e);
      alert("Error al calcular la ruta. Comprueba origen y destino.");
    }
  }, [origin, destination, transport]);

  // ── Toggle layers ─────────────────────────────────────────────────────────
  const handleToggleLayer = useCallback(async (layer, on, opts = {}) => {
    const map = mapRef.current;
    if (!map || !mapReady.current) return;

    if (layer === "traffic_flow") {
      setAzureLayer(map, SRC_AZ_FLOW, "az-flow-lyr",
        azureTileUrl("flow"), on);
    } else if (layer === "traffic_incidents") {
      setAzureLayer(map, SRC_AZ_INC, "az-inc-lyr",
        azureTileUrl("incident"), on);
    } else if (layer === "parking") {
      if (on) {
        const c = map.getCenter();
        try {
          const data = await fetchParking(c.lat, c.lng, opts.radius || 1500);
          const features = (data?.features || []).map(f => ({
            type:"Feature",
            geometry:{ type:"Point", coordinates:[f.lon, f.lat] },
            properties:{ name: f.name || "Parking" },
          }));
          map.getSource(SRC_PARK)?.setData({ type:"FeatureCollection", features });
        } catch(e) { console.warn("Parking:", e); }
      } else {
        map.getSource(SRC_PARK)?.setData({ type:"FeatureCollection", features:[] });
      }
    } else if (layer === "weather") {
      setAzureLayer(map, "az-weather", "az-weather-lyr",
        azureTileUrl("weather"), on);
    }
  }, []);

  // ── Locate me ─────────────────────────────────────────────────────────────
  const handleLocateMe = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      const { latitude:lat, longitude:lon } = pos.coords;
      mapRef.current?.flyTo({ center:[lon,lat], zoom:15, duration:1200 });
    }, () => alert("No se pudo obtener la ubicación"));
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ width:"100vw", height:"100vh", position:"relative",
      background:"#020a14", overflow:"hidden" }}>

      {/* Map container */}
      <div ref={containerRef} style={{ width:"100%", height:"100%" }}/>

      {/* Route info pill */}
      {routeInfo && (
        <div style={{
          position:"fixed", top:16, left:"50%", transform:"translateX(-50%)",
          background:"rgba(2,10,20,0.93)",
          border:"1px solid rgba(34,211,238,0.3)",
          borderRadius:30, padding:"8px 22px",
          fontFamily:"monospace", fontSize:11, color:"#22d3ee",
          letterSpacing:"0.14em", backdropFilter:"blur(14px)",
          zIndex:160, display:"flex", gap:18, alignItems:"center",
          boxShadow:"0 4px 24px rgba(0,0,0,0.5)",
        }}>
          <span>📍 {routeInfo.distance_km} km</span>
          <span>⏱ {routeInfo.duration_min} min</span>
          {routeInfo.co2_g != null && (
            <span style={{ color:"#4ade80" }}>🌿 {routeInfo.co2_g}g CO₂</span>
          )}
          <span style={{ color:"#334155", fontSize:9 }}>{routeInfo.source}</span>
          <button
            onClick={() => {
              setRouteInfo(null);
              mapRef.current?.getSource(SRC_ROUTE)
                ?.setData({ type:"FeatureCollection", features:[] });
            }}
            style={{ background:"none", border:"none", color:"#475569",
              cursor:"pointer", marginLeft:4, fontSize:14, lineHeight:1 }}>
            ✕
          </button>
        </div>
      )}

      {/* Orb */}
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
        mapClickLatLon={mapClick}
      />

      {/* Popup style */}
      <style>{`
        .maplibregl-popup-content {
          background: rgba(2,10,20,0.95) !important;
          border: 1px solid rgba(251,146,60,0.4) !important;
          border-radius: 10px !important;
          padding: 10px 14px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.6) !important;
        }
        .maplibregl-popup-tip { display: none !important; }
      `}</style>
    </div>
  );
}
