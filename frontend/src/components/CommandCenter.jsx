/**
 * CommandCenter — production ready
 * Backend: https://command-center-backend-40az.onrender.com
 * • Ruta OSRM real (texto libre o lat,lon)
 * • Parking OSM (radio mínimo 1500 m)
 * • Azure tiles cuando AZURE_MAPS_KEY esté activo
 * • Eventos DGT/SCT/Madrid como GeoJSON
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import OrbeoCommand from "@/components/OrbeoCommand";
import { STYLES } from "@/lib/mapStyles";
import { fetchEvents, fetchParking, geocode, fetchRoute, azureTileUrl } from "@/lib/api";

// ── Severity colours ──────────────────────────────────────────────────────────
const SEV_COLOR = { critical:"#f87171", warning:"#fb923c", info:"#22d3ee" };
const KIND_GLYPH = {
  obras:"⚠", accidente:"✕", congestion:"≋", peligro:"▲", meteo:"☁", incidencia:"i",
};

// ── Source / layer IDs ────────────────────────────────────────────────────────
const SRC_EV  = "ev";  const LYR_EV_C = "ev-c";  const LYR_EV_T = "ev-t";
const SRC_RT  = "rt";  const LYR_RT_B = "rt-b";   const LYR_RT   = "rt";
const SRC_PK  = "pk";  const LYR_PK   = "pk-c";

// ── SVG pin ───────────────────────────────────────────────────────────────────
function pinEl(label, color) {
  const el = document.createElement("div");
  el.style.cssText = "width:36px;height:44px;pointer-events:none;";
  el.innerHTML = `<svg viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg"
    style="width:100%;height:100%;filter:drop-shadow(0 2px 8px ${color}99)">
    <path d="M18 2C10.3 2 4 8.3 4 16c0 10.5 14 26 14 26s14-15.5 14-26C32 8.3 25.7 2 18 2z"
      fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="18" cy="16" r="7" fill="rgba(255,255,255,0.92)"/>
    <text x="18" y="20" text-anchor="middle" font-size="9" font-weight="700"
      font-family="monospace" fill="${color}">${label}</text>
  </svg>`;
  return el;
}

// ── Azure raster layer helper ─────────────────────────────────────────────────
function setAzureLayer(map, srcId, lyrId, tileUrl, on) {
  if (on) {
    if (!map.getSource(srcId)) {
      map.addSource(srcId, { type:"raster", tiles:[tileUrl], tileSize:256 });
      map.addLayer({ id:lyrId, type:"raster", source:srcId, paint:{"raster-opacity":0.7} });
    }
  } else {
    if (map.getLayer(lyrId))  map.removeLayer(lyrId);
    if (map.getSource(srcId)) map.removeSource(srcId);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CommandCenter() {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const mapReady     = useRef(false);
  const mkrA         = useRef(null);   // origin marker
  const mkrB         = useRef(null);   // dest marker

  const [origin,      setOrigin]      = useState("");
  const [destination, setDestination] = useState("");
  const [transport,   setTransport]   = useState("car");
  const [routeInfo,   setRouteInfo]   = useState(null);
  const [mapClick,    setMapClick]    = useState(null);

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLES?.normal?.style || "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [-3.7038, 40.4168],
      zoom: 12,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch:true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ unit:"metric" }), "bottom-left");

    map.on("load", () => {
      mapReady.current = true;

      // Events
      map.addSource(SRC_EV, { type:"geojson", data:{ type:"FeatureCollection", features:[] } });
      map.addLayer({ id:LYR_EV_C, type:"circle", source:SRC_EV,
        paint:{
          "circle-radius":9,
          "circle-color":["match",["get","severity"],
            "critical",SEV_COLOR.critical,"warning",SEV_COLOR.warning,SEV_COLOR.info],
          "circle-opacity":0.92,
          "circle-stroke-width":1.5, "circle-stroke-color":"#020a14",
        }
      });
      map.addLayer({ id:LYR_EV_T, type:"symbol", source:SRC_EV,
        layout:{
          "text-field":["get","glyph"], "text-size":10,
          "text-allow-overlap":true, "text-ignore-placement":true, "text-anchor":"center",
        },
        paint:{ "text-color":"#020a14" },
      });

      // Route
      map.addSource(SRC_RT, { type:"geojson", data:{ type:"FeatureCollection", features:[] } });
      map.addLayer({ id:LYR_RT_B, type:"line", source:SRC_RT,
        layout:{"line-cap":"round","line-join":"round"},
        paint:{"line-color":"#020a14","line-width":8,"line-opacity":0.5},
      });
      map.addLayer({ id:LYR_RT, type:"line", source:SRC_RT,
        layout:{"line-cap":"round","line-join":"round"},
        paint:{"line-color":"#22d3ee","line-width":4,"line-opacity":0.92},
      });

      // Parking
      map.addSource(SRC_PK, { type:"geojson", data:{ type:"FeatureCollection", features:[] } });
      map.addLayer({ id:LYR_PK, type:"circle", source:SRC_PK,
        paint:{
          "circle-radius":7,"circle-color":"#a78bfa","circle-opacity":0.88,
          "circle-stroke-width":1,"circle-stroke-color":"#020a14",
        }
      });

      // Event popup
      map.on("click", LYR_EV_C, e => {
        const p = e.features[0]?.properties;
        if (!p) return;
        new maplibregl.Popup({ offset:14 })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-family:monospace;font-size:11px;color:#e2e8f0">
            <b style="color:#fb923c">${p.severity?.toUpperCase()||"INFO"}</b><br>
            ${p.title||""}<br>
            <span style="color:#64748b;font-size:10px">${(p.description||"").slice(0,90)}</span>
          </div>`)
          .addTo(map);
      });
      map.on("mouseenter", LYR_EV_C, () => { map.getCanvas().style.cursor="pointer"; });
      map.on("mouseleave", LYR_EV_C, () => { map.getCanvas().style.cursor=""; });

      // Map click → geocode → pass to orb
      map.on("click", async e => {
        const hits = map.queryRenderedFeatures(e.point, { layers:[LYR_EV_C] });
        if (hits.length) return;
        const { lng, lat } = e.lngLat;
        let address = `${lat.toFixed(5)},${lng.toFixed(5)}`;
        try {
          const r = await geocode(`${lat},${lng}`);
          if (r?.display_name) address = r.display_name;
        } catch {}
        setMapClick({ lat, lon: lng, address });
      });

      // Load events
      loadEvents(map, 40.4168, -3.7038);
    });

    return () => { map.remove(); mapRef.current=null; mapReady.current=false; };
  }, []);

  // ── Events ──────────────────────────────────────────────────────────────────
  const loadEvents = useCallback(async (map, lat, lon) => {
    try {
      const data = await fetchEvents("madrid", lat, lon, 150);
      const features = (data?.features||[]).map(f => ({
        type:"Feature",
        geometry:{ type:"Point", coordinates:[f.lon, f.lat] },
        properties:{ severity:f.severity, title:f.title, description:f.description,
          glyph:KIND_GLYPH[f.kind]||"i" },
      }));
      map.getSource(SRC_EV)?.setData({ type:"FeatureCollection", features });
    } catch(e) { console.warn("events:", e); }
  }, []);

  // ── Place marker + fly ──────────────────────────────────────────────────────
  async function placeMarker(address, markerRef, color, label) {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current?.remove();
    markerRef.current = null;
    if (!address) return;

    // Try lat,lon format first
    const ll = address.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    let lat, lon;
    if (ll) {
      lat = parseFloat(ll[1]); lon = parseFloat(ll[2]);
    } else {
      const r = await geocode(address).catch(() => null);
      if (!r?.lat) return;
      lat = r.lat; lon = r.lon;
    }

    markerRef.current = new maplibregl.Marker({ element:pinEl(label, color), anchor:"bottom" })
      .setLngLat([lon, lat]).addTo(map);
    map.flyTo({ center:[lon, lat], zoom:13, duration:1100 });
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleOriginChange = useCallback(async (addr) => {
    setOrigin(addr);
    await placeMarker(addr, mkrA, "#4ade80", "A");
  }, []);

  const handleDestinationChange = useCallback(async (addr) => {
    setDestination(addr);
    await placeMarker(addr, mkrB, "#f87171", "B");
  }, []);

  // ── COMPUTE ROUTE ───────────────────────────────────────────────────────────
  const handleCompute = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    if (!origin || !destination) {
      alert("Define primero el origen y el destino");
      return;
    }
    try {
      // fetchRoute sends `from` and `to` directly — backend geocodes if needed
      const result = await fetchRoute(origin, destination, transport);
      if (!result?.geometry?.coordinates?.length) {
        console.warn("No geometry:", result);
        alert("La ruta no devolvió coordenadas");
        return;
      }

      // Draw on map
      map.getSource(SRC_RT)?.setData({
        type:"FeatureCollection",
        features:[{ type:"Feature", geometry:result.geometry, properties:{} }],
      });

      // Fit bounds
      const coords = result.geometry.coordinates;
      if (coords.length > 1) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        map.fitBounds(bounds, { padding:80, duration:1400 });
      }

      setRouteInfo({
        distance_km:  result.distance_km,
        duration_min: result.duration_min,
        co2_g:        result.co2_g,
        source:       result.source,
      });
    } catch(e) {
      console.error("Route error:", e);
      alert("Error calculando la ruta. Revisa la consola para más detalles.");
    }
  }, [origin, destination, transport]);

  // ── Toggle layers ───────────────────────────────────────────────────────────
  const handleToggleLayer = useCallback(async (layer, on, opts={}) => {
    const map = mapRef.current;
    if (!map || !mapReady.current) return;

    if (layer === "traffic_flow") {
      setAzureLayer(map,"az-flow","az-flow-l", azureTileUrl("flow"), on);
    } else if (layer === "traffic_incidents") {
      setAzureLayer(map,"az-inc","az-inc-l", azureTileUrl("incident"), on);
    } else if (layer === "weather") {
      setAzureLayer(map,"az-wx","az-wx-l", azureTileUrl("weather"), on);
    } else if (layer === "parking") {
      if (on) {
        const c = map.getCenter();
        const radius = Math.max(1500, opts.radius || 1500); // min 1500m
        try {
          const data = await fetchParking(c.lat, c.lng, radius);
          const features = (data?.features||[]).map(f => ({
            type:"Feature",
            geometry:{ type:"Point", coordinates:[f.lon, f.lat] },
            properties:{ name:f.name||"Parking" },
          }));
          map.getSource(SRC_PK)?.setData({ type:"FeatureCollection", features });
        } catch(e) { console.warn("parking:", e); }
      } else {
        map.getSource(SRC_PK)?.setData({ type:"FeatureCollection", features:[] });
      }
    }
  }, []);

  // ── Locate me ───────────────────────────────────────────────────────────────
  const handleLocateMe = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => mapRef.current?.flyTo({
        center:[pos.coords.longitude, pos.coords.latitude], zoom:15, duration:1200,
      }),
      () => alert("No se pudo obtener la ubicación")
    );
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ width:"100vw", height:"100vh", position:"relative",
      background:"#020a14", overflow:"hidden" }}>

      <div ref={containerRef} style={{ width:"100%", height:"100%" }}/>

      {/* Route info pill */}
      {routeInfo && (
        <div style={{
          position:"fixed", top:16, left:"50%", transform:"translateX(-50%)",
          background:"rgba(2,10,20,0.94)", border:"1px solid rgba(34,211,238,0.3)",
          borderRadius:28, padding:"8px 22px",
          fontFamily:"monospace", fontSize:11, color:"#22d3ee",
          letterSpacing:"0.13em", backdropFilter:"blur(14px)",
          zIndex:160, display:"flex", gap:16, alignItems:"center",
          boxShadow:"0 4px 24px rgba(0,0,0,0.5)",
        }}>
          <span>📍 {routeInfo.distance_km} km</span>
          <span>⏱ {routeInfo.duration_min} min</span>
          {routeInfo.co2_g != null && (
            <span style={{ color:"#4ade80" }}>🌿 {routeInfo.co2_g}g CO₂</span>
          )}
          <span style={{ color:"#334155", fontSize:9 }}>{routeInfo.source}</span>
          <button onClick={() => {
            setRouteInfo(null);
            mapRef.current?.getSource(SRC_RT)
              ?.setData({ type:"FeatureCollection", features:[] });
          }} style={{ background:"none", border:"none", color:"#475569",
            cursor:"pointer", marginLeft:4, fontSize:16, lineHeight:1 }}>✕</button>
        </div>
      )}

      <OrbeoCommand
        mapRef={mapRef}
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

      <style>{`
        .maplibregl-popup-content {
          background:rgba(2,10,20,0.96)!important;
          border:1px solid rgba(251,146,60,0.35)!important;
          border-radius:10px!important; padding:10px 14px!important;
          box-shadow:0 4px 20px rgba(0,0,0,0.6)!important;
          color:#e2e8f0!important;
        }
        .maplibregl-popup-tip { display:none!important; }
      `}</style>
    </div>
  );
}
