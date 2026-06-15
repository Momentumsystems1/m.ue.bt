/**
 * OrbeoCommand — rebuilt from scratch.
 *
 * UX flow:
 *  1. User clicks an orb button → control rectangle slides in, orb pulses cyan
 *  2. User fills variables in rectangle → clicks EJECUTAR
 *  3. Rectangle flies to right panel (history), orb turns solid green (done)
 *  4. Orb rotates to surface next logical options
 */
import React, {
  useState, useRef, useCallback, useMemo, useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Route, Layers, Info, Compass, User, Search,
  MapPin, Flag, RotateCcw, ArrowLeftRight, Car,
  Footprints, Bike, Bus, Zap, ParkingCircle,
  CloudRain, AlertTriangle, Crosshair, HelpCircle,
  Share2, Megaphone, Mic, Clock, Bookmark,
  ChevronLeft, Play, X, Check, Minimize2,
} from "lucide-react";

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICONS = {
  Route, Layers, Info, Compass, User, Search,
  MapPin, Flag, RotateCcw, ArrowLeftRight, Car,
  Footprints, Bike, Bus, Zap, ParkingCircle,
  CloudRain, AlertTriangle, Crosshair, HelpCircle,
  Share2, Megaphone, Mic, Clock, Bookmark, Minimize2,
};

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  idle:    "#22d3ee",  // cyan
  active:  "#fbbf24",  // amber — selected, pulsing
  done:    "#4ade80",  // green — executed
  bg:      "#020a14",
  surface: "rgba(2,16,34,0.92)",
  border:  "rgba(34,211,238,0.25)",
};

// ─── Button definition ───────────────────────────────────────────────────────
// Each button has:
//   id, icon, label, color (optional override)
//   fields: [] — variables the user fills in the control panel
//   nextLogical: [] — ids of buttons to surface after execution
//   action: fn called with filled values
const BUTTONS = [
  {
    id: "origin",
    icon: "MapPin",
    label: "INICIO",
    color: "#4ade80",
    fields: [
      { key: "address", label: "Dirección de inicio", type: "geocode", placeholder: "Escribe o haz click en el mapa…" },
    ],
    nextLogical: ["destination", "transport"],
  },
  {
    id: "destination",
    icon: "Flag",
    label: "DESTINO",
    color: "#f87171",
    fields: [
      { key: "address", label: "Dirección de destino", type: "geocode", placeholder: "Escribe o haz click en el mapa…" },
    ],
    nextLogical: ["transport", "compute"],
  },
  {
    id: "transport",
    icon: "Car",
    label: "MODO",
    color: "#fbbf24",
    fields: [
      {
        key: "mode",
        label: "Modo de transporte",
        type: "select",
        options: [
          { value: "car",     label: "🚗  Coche" },
          { value: "foot",    label: "🚶  A pie" },
          { value: "bike",    label: "🚲  Bici" },
          { value: "transit", label: "🚌  Transporte público" },
          { value: "taxi",    label: "🚕  Taxi / Uber" },
        ],
        default: "car",
      },
    ],
    nextLogical: ["compute", "avoid_tolls"],
  },
  {
    id: "compute",
    icon: "Route",
    label: "CALCULAR",
    color: "#22c55e",
    fields: [],   // no fields — direct execute
    nextLogical: ["traffic", "parking", "reset"],
  },
  {
    id: "traffic",
    icon: "AlertTriangle",
    label: "TRÁFICO",
    color: "#fb923c",
    fields: [
      {
        key: "layer",
        label: "Capa de tráfico",
        type: "select",
        options: [
          { value: "flow",      label: "Flujo en tiempo real" },
          { value: "incidents", label: "Incidencias DGT" },
          { value: "both",      label: "Flujo + incidencias" },
        ],
        default: "both",
      },
    ],
    nextLogical: ["parking", "weather", "compute"],
  },
  {
    id: "parking",
    icon: "ParkingCircle",
    label: "PARKING",
    color: "#a78bfa",
    fields: [
      { key: "radius", label: "Radio de búsqueda (m)", type: "number", placeholder: "1500", default: "1500" },
    ],
    nextLogical: ["bike_stations", "compute", "reset"],
  },
  {
    id: "bike_stations",
    icon: "Bike",
    label: "BICI",
    color: "#34d399",
    fields: [
      { key: "radius_km", label: "Radio (km)", type: "number", placeholder: "2", default: "2" },
    ],
    nextLogical: ["weather", "compute", "reset"],
  },
  {
    id: "weather",
    icon: "CloudRain",
    label: "CLIMA",
    color: "#38bdf8",
    fields: [],
    nextLogical: ["traffic", "compute", "reset"],
  },
  {
    id: "locate_me",
    icon: "Crosshair",
    label: "MI POSICIÓN",
    color: "#22d3ee",
    fields: [],
    nextLogical: ["origin", "destination", "traffic"],
  },
  {
    id: "avoid_tolls",
    icon: "Zap",
    label: "EVITAR PEAJES",
    color: "#fbbf24",
    fields: [
      {
        key: "avoid",
        label: "¿Evitar?",
        type: "select",
        options: [
          { value: "yes", label: "Sí, evitar peajes" },
          { value: "no",  label: "No, usar autopistas" },
        ],
        default: "yes",
      },
    ],
    nextLogical: ["compute", "transport"],
  },
  {
    id: "reset",
    icon: "RotateCcw",
    label: "LIMPIAR",
    color: "#f87171",
    fields: [],
    nextLogical: ["origin", "locate_me", "traffic"],
  },
  {
    id: "share",
    icon: "Share2",
    label: "COMPARTIR",
    color: "#818cf8",
    fields: [],
    nextLogical: ["compute", "reset"],
  },
];

const BTN_MAP = Object.fromEntries(BUTTONS.map(b => [b.id, b]));

// Initial surface: first logical set
const INITIAL_VISIBLE = ["locate_me", "origin", "destination", "transport", "traffic", "parking"];

// ─── ControlPanel — the rectangle that slides in ──────────────────────────
function ControlPanel({ btn, values, onChange, onExecute, onClose, mapClickValue }) {
  const hasFields = btn.fields.length > 0;

  // auto-fill geocode field if map was clicked
  useEffect(() => {
    if (mapClickValue && btn.fields.some(f => f.type === "geocode")) {
      const geoField = btn.fields.find(f => f.type === "geocode");
      if (geoField && !values[geoField.key]) {
        onChange(geoField.key, mapClickValue);
      }
    }
  }, [mapClickValue]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{  opacity: 0, y: 60, scale: 0.88 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      style={{
        position: "absolute",
        bottom: "calc(50% + 80px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: 320,
        background: C.surface,
        border: `1.5px solid ${btn.color || C.idle}`,
        borderRadius: 14,
        padding: "18px 20px 16px",
        backdropFilter: "blur(20px)",
        zIndex: 60,
        boxShadow: `0 0 32px ${btn.color || C.idle}44`,
        pointerEvents: "auto",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: btn.color || C.idle,
            boxShadow: `0 0 8px ${btn.color || C.idle}`,
            animation: "pulse-dot 1s ease-in-out infinite",
          }} />
          <span style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.2em", color: btn.color || C.idle, fontWeight: 700 }}>
            {btn.label}
          </span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 2 }}>
          <X size={14} />
        </button>
      </div>

      {/* Fields */}
      {btn.fields.map(field => (
        <div key={field.key} style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontFamily: "monospace", fontSize: 9, letterSpacing: "0.15em", color: "#64748b", marginBottom: 5 }}>
            {field.label.toUpperCase()}
          </label>
          {field.type === "select" ? (
            <select
              value={values[field.key] ?? field.default ?? ""}
              onChange={e => onChange(field.key, e.target.value)}
              style={{
                width: "100%", padding: "8px 10px",
                background: "rgba(34,211,238,0.05)",
                border: "1px solid rgba(34,211,238,0.2)",
                borderRadius: 8, color: "#e2e8f0",
                fontFamily: "monospace", fontSize: 12,
                outline: "none", cursor: "pointer",
              }}
            >
              {field.options.map(o => (
                <option key={o.value} value={o.value} style={{ background: "#0f172a" }}>{o.label}</option>
              ))}
            </select>
          ) : (
            <div style={{ position: "relative" }}>
              <input
                type={field.type === "number" ? "number" : "text"}
                value={values[field.key] ?? ""}
                onChange={e => onChange(field.key, e.target.value)}
                placeholder={field.placeholder || ""}
                autoFocus
                style={{
                  width: "100%", padding: "8px 10px", boxSizing: "border-box",
                  background: "rgba(34,211,238,0.05)",
                  border: `1px solid ${values[field.key] ? (btn.color || C.idle) : "rgba(34,211,238,0.2)"}`,
                  borderRadius: 8, color: "#e2e8f0",
                  fontFamily: "monospace", fontSize: 12, outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
              {field.type === "geocode" && (
                <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 10, fontFamily: "monospace" }}>
                  ↖ mapa
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {!hasFields && (
        <p style={{ fontFamily: "monospace", fontSize: 11, color: "#475569", marginBottom: 12, textAlign: "center" }}>
          Listo para ejecutar →
        </p>
      )}

      {/* Execute button */}
      <button
        onClick={onExecute}
        style={{
          width: "100%",
          padding: "10px 0",
          background: `linear-gradient(135deg, ${btn.color || C.idle}22, ${btn.color || C.idle}44)`,
          border: `1.5px solid ${btn.color || C.idle}`,
          borderRadius: 9,
          color: btn.color || C.idle,
          fontFamily: "monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.22em",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          transition: "all 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = `${btn.color || C.idle}33`}
        onMouseLeave={e => e.currentTarget.style.background = `linear-gradient(135deg, ${btn.color || C.idle}22, ${btn.color || C.idle}44)`}
      >
        <Play size={12} /> EJECUTAR
      </button>
    </motion.div>
  );
}

// ─── Orb button ───────────────────────────────────────────────────────────
function OrbButton({ btn, state, angle, radius, onSelect }) {
  // state: "idle" | "active" | "done"
  const Icon = ICONS[btn.icon] || Route;
  const color = state === "done"   ? C.done
              : state === "active" ? (btn.color || C.idle)
              : C.idle;

  const rad = (angle * Math.PI) / 180;
  const x   = Math.cos(rad) * radius;
  const y   = Math.sin(rad) * radius;

  return (
    <motion.button
      onClick={() => onSelect(btn.id)}
      title={btn.label}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: 1,
        scale: state === "active" ? [1, 1.12, 1] : 1,
        x, y,
        boxShadow: state === "active"
          ? [`0 0 0px ${color}`, `0 0 22px ${color}`, `0 0 0px ${color}`]
          : state === "done"
          ? `0 0 14px ${C.done}88`
          : `0 0 8px ${color}44`,
      }}
      transition={{
        scale:     state === "active" ? { repeat: Infinity, duration: 1.2, ease: "easeInOut" } : { duration: 0.3 },
        boxShadow: state === "active" ? { repeat: Infinity, duration: 1.2, ease: "easeInOut" } : { duration: 0.3 },
        opacity: { duration: 0.25 },
        x: { type: "spring", stiffness: 200, damping: 22 },
        y: { type: "spring", stiffness: 200, damping: 22 },
      }}
      style={{
        position: "absolute",
        left: "50%",
        top:  "50%",
        width: 48,
        height: 48,
        marginLeft: -24,
        marginTop:  -24,
        borderRadius: "50%",
        background: state === "done"
          ? "rgba(74,222,128,0.15)"
          : `${color}18`,
        border: `2px solid ${color}${state === "idle" ? "88" : "ff"}`,
        color,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        cursor: "pointer",
        zIndex: 10,
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {state === "done"
        ? <Check size={18} strokeWidth={2.5} />
        : <Icon size={16} strokeWidth={1.8} />
      }
      <span style={{ fontFamily: "monospace", fontSize: 7, letterSpacing: "0.08em", lineHeight: 1, opacity: 0.85 }}>
        {btn.label.length > 7 ? btn.label.slice(0, 7) : btn.label}
      </span>
    </motion.button>
  );
}

// ─── History entry (right panel card) ─────────────────────────────────────
function HistoryCard({ entry, index }) {
  const btn = BTN_MAP[entry.id];
  const color = btn?.color || C.idle;
  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 260, damping: 24 }}
      style={{
        background: `${color}10`,
        border: `1px solid ${color}44`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: entry.summary ? 4 : 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.done, flexShrink: 0 }} />
        <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color }}>{entry.label}</span>
      </div>
      {entry.summary && (
        <p style={{ fontFamily: "monospace", fontSize: 10, color: "#94a3b8", margin: 0, paddingLeft: 14 }}>
          {entry.summary}
        </p>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
export default function OrbeoCommand({
  // Map integration props
  origin, destination,
  onOriginChange, onDestinationChange,
  onCompute, onToggleLayer, onLocateMe,
  onTransportChange, transportMode,
  mapClickLatLon,  // { lat, lon, address } — set by parent when user clicks map
}) {
  const [visibleIds, setVisibleIds] = useState(INITIAL_VISIBLE);
  const [activeId,  setActiveId]  = useState(null);   // currently open panel
  const [doneIds,   setDoneIds]   = useState({});     // id → true
  const [values,    setValues]    = useState({});     // activeId field values
  const [history,   setHistory]   = useState([]);     // executed cards
  const [minimized, setMinimized] = useState(false);
  const [mapClickConsumed, setMapClickConsumed] = useState(null);

  // Consume map click for geocode fields
  useEffect(() => {
    if (!mapClickLatLon || !activeId) return;
    const btn = BTN_MAP[activeId];
    if (!btn) return;
    const geoField = btn.fields.find(f => f.type === "geocode");
    if (!geoField) return;
    setValues(prev => ({ ...prev, [geoField.key]: mapClickLatLon.address || `${mapClickLatLon.lat.toFixed(5)}, ${mapClickLatLon.lon.toFixed(5)}` }));
  }, [mapClickLatLon, activeId]);

  const handleSelect = useCallback((id) => {
    const btn = BTN_MAP[id];
    if (!btn) return;

    // If no fields → execute immediately
    if (btn.fields.length === 0) {
      executeBtn(id, {});
      return;
    }

    // Open control panel
    setActiveId(id);
    // Pre-fill defaults
    const defaults = {};
    btn.fields.forEach(f => { if (f.default) defaults[f.key] = f.default; });
    setValues(defaults);
  }, [doneIds]);

  const handleFieldChange = useCallback((key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
  }, []);

  const executeBtn = useCallback((id, vals) => {
    const btn = BTN_MAP[id];
    if (!btn) return;

    // Call the appropriate prop
    switch (id) {
      case "origin":
        if (onOriginChange) onOriginChange(vals.address || "");
        break;
      case "destination":
        if (onDestinationChange) onDestinationChange(vals.address || "");
        break;
      case "transport":
        if (onTransportChange) onTransportChange(vals.mode || "car");
        break;
      case "compute":
        if (onCompute) onCompute();
        break;
      case "traffic":
        if (onToggleLayer) {
          onToggleLayer("traffic_flow",      vals.layer !== "incidents");
          onToggleLayer("traffic_incidents", vals.layer !== "flow");
        }
        break;
      case "parking":
        if (onToggleLayer) onToggleLayer("parking", true);
        break;
      case "bike_stations":
        if (onToggleLayer) onToggleLayer("bikes", true);
        break;
      case "weather":
        if (onToggleLayer) onToggleLayer("weather", true);
        break;
      case "locate_me":
        if (onLocateMe) onLocateMe();
        break;
      case "reset":
        if (onOriginChange) onOriginChange("");
        if (onDestinationChange) onDestinationChange("");
        setDoneIds({});
        setHistory([]);
        setVisibleIds(INITIAL_VISIBLE);
        setActiveId(null);
        return;
      case "share":
        try { navigator.clipboard?.writeText(window.location.href); } catch {}
        break;
      case "avoid_tolls":
        // pass through to route compute
        break;
      default: break;
    }

    // Build summary string
    const summary = Object.entries(vals)
      .map(([k, v]) => {
        const field = btn.fields.find(f => f.key === k);
        if (field?.type === "select") {
          const opt = field.options?.find(o => o.value === v);
          return opt ? opt.label : v;
        }
        return v;
      })
      .filter(Boolean)
      .join(" · ");

    // Mark done + add to history
    setDoneIds(prev => ({ ...prev, [id]: true }));
    setHistory(prev => [{ id, label: btn.label, summary }, ...prev]);
    setActiveId(null);

    // Surface next logical buttons
    const next = btn.nextLogical || [];
    if (next.length > 0) {
      setVisibleIds(prev => {
        const keep = prev.filter(vid => doneIds[vid] || vid === id);
        const add  = next.filter(n => !keep.includes(n));
        // max 6 visible
        return [...new Set([...keep, ...add])].slice(0, 6);
      });
    }
  }, [doneIds, onOriginChange, onDestinationChange, onTransportChange, onCompute, onToggleLayer, onLocateMe]);

  const handleExecute = useCallback(() => {
    if (!activeId) return;
    executeBtn(activeId, values);
  }, [activeId, values, executeBtn]);

  const handleClose = useCallback(() => setActiveId(null), []);

  // Position buttons in a circle
  const visibleButtons = useMemo(() =>
    visibleIds.map((id, i) => ({
      btn: BTN_MAP[id],
      angle: (i * 360) / visibleIds.length - 90,
    })).filter(x => x.btn),
    [visibleIds]
  );

  const orbRadius = 130;

  if (minimized) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 100, cursor: "pointer" }}
        onClick={() => setMinimized(false)}
      >
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(2,16,34,0.92)",
          border: `2px solid ${C.idle}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.idle, boxShadow: `0 0 20px ${C.idle}66`,
        }}>
          <Route size={20} />
        </div>
      </motion.div>
    );
  }

  return (
    <div style={{
      position: "fixed",
      bottom: 0, right: 0,
      width: "100vw", height: "100vh",
      display: "flex",
      pointerEvents: "none",
      zIndex: 50,
    }}>
      {/* ── Right history panel ─────────────────────────── */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 340 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 340 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              width: 260,
              maxHeight: "70vh",
              overflowY: "auto",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: "14px 12px",
              backdropFilter: "blur(18px)",
              pointerEvents: "auto",
              scrollbarWidth: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.25em", color: "#475569" }}>
                RUTA EN CONSTRUCCIÓN
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.done, animation: "pulse-dot 1.5s infinite" }} />
                <span style={{ fontFamily: "monospace", fontSize: 9, color: C.done }}>{history.length} PASOS</span>
              </div>
            </div>
            {history.map((entry, i) => (
              <HistoryCard key={`${entry.id}-${i}`} entry={entry} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Orb + Control panel ─────────────────────────── */}
      <div style={{
        position: "absolute",
        bottom: 40,
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "auto",
      }}>
        {/* Control panel */}
        <AnimatePresence>
          {activeId && (
            <ControlPanel
              btn={BTN_MAP[activeId]}
              values={values}
              onChange={handleFieldChange}
              onExecute={handleExecute}
              onClose={handleClose}
              mapClickValue={null}
            />
          )}
        </AnimatePresence>

        {/* Orb container */}
        <div style={{ position: "relative", width: orbRadius * 2 + 100, height: orbRadius * 2 + 100 }}>

          {/* Ring */}
          <svg
            width="100%" height="100%"
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          >
            <circle
              cx="50%" cy="50%" r={orbRadius}
              fill="none"
              stroke={C.idle}
              strokeWidth="1"
              strokeOpacity="0.15"
              strokeDasharray="4 8"
            />
            {activeId && (
              <circle
                cx="50%" cy="50%" r={orbRadius}
                fill="none"
                stroke={BTN_MAP[activeId]?.color || C.idle}
                strokeWidth="1.5"
                strokeOpacity="0.5"
              />
            )}
          </svg>

          {/* Orb buttons */}
          {visibleButtons.map(({ btn, angle }) => (
            <OrbButton
              key={btn.id}
              btn={btn}
              state={activeId === btn.id ? "active" : doneIds[btn.id] ? "done" : "idle"}
              angle={angle}
              radius={orbRadius}
              onSelect={handleSelect}
            />
          ))}

          {/* Sun / Center button */}
          <motion.div
            animate={{
              boxShadow: activeId
                ? [`0 0 0px ${BTN_MAP[activeId]?.color || C.idle}`, `0 0 30px ${BTN_MAP[activeId]?.color || C.idle}`, `0 0 0px ${BTN_MAP[activeId]?.color || C.idle}`]
                : `0 0 20px ${C.idle}44`,
            }}
            transition={activeId
              ? { repeat: Infinity, duration: 1.0, ease: "easeInOut" }
              : { duration: 0.4 }
            }
            style={{
              position: "absolute",
              left: "50%", top: "50%",
              width: 72, height: 72,
              marginLeft: -36, marginTop: -36,
              borderRadius: "50%",
              background: C.surface,
              border: `2px solid ${activeId ? (BTN_MAP[activeId]?.color || C.idle) : C.idle}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 20,
            }}
            onClick={() => {
              if (activeId) handleClose();
              else if (onLocateMe) onLocateMe();
            }}
          >
            <Crosshair size={20} color={activeId ? (BTN_MAP[activeId]?.color || C.idle) : C.idle} strokeWidth={1.5} />
            <span style={{ fontFamily: "monospace", fontSize: 7, letterSpacing: "0.12em", color: "#475569", marginTop: 2 }}>
              {activeId ? "ESC" : "ORBEO"}
            </span>
          </motion.div>

          {/* Minimize button */}
          <button
            onClick={() => setMinimized(true)}
            style={{
              position: "absolute",
              top: 4, right: 4,
              background: "none", border: "none",
              color: "#334155", cursor: "pointer", padding: 4,
            }}
          >
            <Minimize2 size={13} />
          </button>
        </div>
      </div>

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
