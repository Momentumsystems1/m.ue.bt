/**
 * OrbeoCommand v2
 * ─────────────────────────────────────────────────────────────────────────────
 * • Orbe grande (radio 160 px, 8 botones) draggable con el ratón
 * • Todos los botones siempre visibles — controlan capas / navegación
 * • Click → abre rectángulo de control sobre el orbe
 * • EJECUTAR → rectángulo vuela al panel derecho como tarjeta
 * • Botón verde = activo. Click de nuevo → desactiva (toggle)
 * • Después de ejecutar, los botones más lógicos se resaltan suavemente
 * • La ruta del navegador funciona: origen → destino → calcular → línea en mapa
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Route, Layers, MapPin, Flag, Car, Footprints, Bike, Bus,
  ParkingCircle, CloudRain, AlertTriangle, Crosshair, RotateCcw,
  Share2, Zap, Play, X, Check, Minimize2, Maximize2, ChevronRight,
  Navigation,
} from "lucide-react";

// ─── Icon registry ────────────────────────────────────────────────────────────
const ICONS = {
  Route, Layers, MapPin, Flag, Car, Footprints, Bike, Bus,
  ParkingCircle, CloudRain, AlertTriangle, Crosshair, RotateCcw,
  Share2, Zap, Navigation,
};

// ─── Button definitions ───────────────────────────────────────────────────────
// nextLogical: ids to visually highlight after this executes
const BUTTONS = [
  {
    id: "locate_me",
    icon: "Crosshair",
    label: "MI POS.",
    color: "#22d3ee",
    fields: [],
    nextLogical: ["origin", "destination"],
    desc: "Centrar en mi posición",
  },
  {
    id: "origin",
    icon: "MapPin",
    label: "INICIO",
    color: "#4ade80",
    fields: [
      { key: "address", label: "Dirección de inicio", type: "geocode",
        placeholder: "Escribe dirección o haz click en el mapa…" },
    ],
    nextLogical: ["destination"],
    desc: "Fijar punto de origen",
  },
  {
    id: "destination",
    icon: "Flag",
    label: "DESTINO",
    color: "#f87171",
    fields: [
      { key: "address", label: "Dirección de destino", type: "geocode",
        placeholder: "Escribe dirección o haz click en el mapa…" },
    ],
    nextLogical: ["transport", "compute"],
    desc: "Fijar punto de destino",
  },
  {
    id: "transport",
    icon: "Car",
    label: "MODO",
    color: "#fbbf24",
    fields: [
      {
        key: "mode", label: "Modo de transporte", type: "select",
        options: [
          { value: "car",     label: "🚗  Coche" },
          { value: "foot",    label: "🚶  A pie" },
          { value: "bike",    label: "🚲  Bici" },
          { value: "transit", label: "🚌  Transporte público" },
          { value: "taxi",    label: "🚕  Taxi / VTC" },
        ],
        default: "car",
      },
    ],
    nextLogical: ["compute"],
    desc: "Elegir modo de transporte",
  },
  {
    id: "compute",
    icon: "Route",
    label: "CALCULAR",
    color: "#22c55e",
    fields: [],
    nextLogical: ["traffic", "parking"],
    desc: "Calcular ruta óptima",
    requiresBoth: true,   // needs origin + destination
  },
  {
    id: "traffic",
    icon: "AlertTriangle",
    label: "TRÁFICO",
    color: "#fb923c",
    fields: [
      {
        key: "layer", label: "Capa de tráfico", type: "select",
        options: [
          { value: "both",      label: "Flujo + Incidencias" },
          { value: "flow",      label: "Solo flujo" },
          { value: "incidents", label: "Solo incidencias" },
        ],
        default: "both",
      },
    ],
    nextLogical: ["parking", "weather"],
    desc: "Mostrar tráfico en tiempo real",
    isToggle: true,
  },
  {
    id: "parking",
    icon: "ParkingCircle",
    label: "PARKING",
    color: "#a78bfa",
    fields: [
      { key: "radius", label: "Radio de búsqueda (m)", type: "number",
        placeholder: "1500", default: "1500" },
    ],
    nextLogical: ["bike_stations"],
    desc: "Buscar parkings cercanos",
    isToggle: true,
  },
  {
    id: "weather",
    icon: "CloudRain",
    label: "CLIMA",
    color: "#38bdf8",
    fields: [],
    nextLogical: ["traffic"],
    desc: "Capa meteorológica",
    isToggle: true,
  },
];

const BTN_MAP = Object.fromEntries(BUTTONS.map(b => [b.id, b]));

// ─── Colours ──────────────────────────────────────────────────────────────────
const BG      = "rgba(2,10,20,0.93)";
const BORDER  = "rgba(34,211,238,0.22)";
const CYAN    = "#22d3ee";
const GREEN   = "#4ade80";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function btnState(id, activeId, doneIds) {
  if (id === activeId) return "active";
  if (doneIds[id])     return "done";
  return "idle";
}

// ─── ControlPanel ─────────────────────────────────────────────────────────────
function ControlPanel({ btn, values, onChange, onExecute, onClose, orbPos }) {
  const color = btn.color || CYAN;

  return (
    <motion.div
      key={btn.id}
      initial={{ opacity: 0, scale: 0.88, y: 20 }}
      animate={{ opacity: 1, scale: 1,    y: 0  }}
      exit={{   opacity: 0, scale: 0.82,  y: 30 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      style={{
        position: "fixed",
        // place above the orb centre — orbPos is the orb centre on screen
        left: Math.min(Math.max(orbPos.x - 160, 12), window.innerWidth - 345),
        top:  Math.max(orbPos.y - 260, 12),
        width: 320,
        background: BG,
        border: `1.5px solid ${color}`,
        borderRadius: 16,
        padding: "18px 20px 16px",
        backdropFilter: "blur(24px)",
        zIndex: 200,
        boxShadow: `0 0 40px ${color}33, 0 8px 32px rgba(0,0,0,0.6)`,
        pointerEvents: "auto",
      }}
    >
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{
            display:"inline-block", width:8, height:8, borderRadius:"50%",
            background: color, boxShadow:`0 0 8px ${color}`,
            animation: "orbpulse 1s ease-in-out infinite",
          }}/>
          <span style={{ fontFamily:"monospace", fontSize:11, letterSpacing:"0.2em",
            color, fontWeight:700 }}>{btn.label}</span>
        </div>
        <button onClick={onClose}
          style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", padding:4 }}>
          <X size={14}/>
        </button>
      </div>
      <p style={{ fontFamily:"monospace", fontSize:9, color:"#475569",
        letterSpacing:"0.12em", margin:"0 0 14px" }}>{btn.desc}</p>

      {/* Fields */}
      {btn.fields.map(field => (
        <div key={field.key} style={{ marginBottom:12 }}>
          <label style={{ display:"block", fontFamily:"monospace", fontSize:9,
            letterSpacing:"0.15em", color:"#64748b", marginBottom:5 }}>
            {field.label.toUpperCase()}
          </label>
          {field.type === "select" ? (
            <select
              value={values[field.key] ?? field.default ?? ""}
              onChange={e => onChange(field.key, e.target.value)}
              style={{
                width:"100%", padding:"8px 10px",
                background:"rgba(34,211,238,0.05)",
                border:`1px solid rgba(34,211,238,0.2)`,
                borderRadius:8, color:"#e2e8f0",
                fontFamily:"monospace", fontSize:12, outline:"none", cursor:"pointer",
              }}
            >
              {field.options.map(o => (
                <option key={o.value} value={o.value} style={{ background:"#0f172a" }}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type === "number" ? "number" : "text"}
              value={values[field.key] ?? ""}
              onChange={e => onChange(field.key, e.target.value)}
              placeholder={field.placeholder || ""}
              autoFocus
              style={{
                width:"100%", padding:"8px 10px", boxSizing:"border-box",
                background:"rgba(34,211,238,0.05)",
                border:`1px solid ${values[field.key] ? color : "rgba(34,211,238,0.2)"}`,
                borderRadius:8, color:"#e2e8f0",
                fontFamily:"monospace", fontSize:12, outline:"none",
                transition:"border-color 0.2s",
              }}
            />
          )}
          {field.type === "geocode" && (
            <p style={{ fontFamily:"monospace", fontSize:9, color:"#334155",
              margin:"4px 0 0", letterSpacing:"0.1em" }}>
              ↖ o haz click directamente en el mapa
            </p>
          )}
        </div>
      ))}

      {btn.fields.length === 0 && (
        <p style={{ fontFamily:"monospace", fontSize:11, color:"#475569",
          textAlign:"center", margin:"0 0 14px" }}>
          Sin parámetros — listo para ejecutar
        </p>
      )}

      {/* Execute */}
      <button
        onClick={onExecute}
        style={{
          width:"100%", padding:"10px 0",
          background:`linear-gradient(135deg,${color}22,${color}40)`,
          border:`1.5px solid ${color}`,
          borderRadius:9, color, fontFamily:"monospace",
          fontSize:11, fontWeight:700, letterSpacing:"0.22em",
          cursor:"pointer", display:"flex", alignItems:"center",
          justifyContent:"center", gap:7,
          boxShadow:`0 0 12px ${color}44`,
          transition:"all 0.15s",
        }}
      >
        <Play size={12}/> EJECUTAR
      </button>
    </motion.div>
  );
}

// ─── History card (right panel) ───────────────────────────────────────────────
function HistoryCard({ entry, onRemove }) {
  const btn   = BTN_MAP[entry.id];
  const color = btn?.color || CYAN;
  return (
    <motion.div
      layout
      initial={{ opacity:0, x:60, scale:0.9 }}
      animate={{ opacity:1, x:0,  scale:1   }}
      exit={{    opacity:0, x:60, scale:0.85 }}
      transition={{ type:"spring", stiffness:280, damping:24 }}
      style={{
        background:`${color}12`,
        border:`1px solid ${color}44`,
        borderLeft:`3px solid ${color}`,
        borderRadius:9, padding:"10px 12px", marginBottom:7,
        position:"relative",
      }}
    >
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom: entry.summary ? 4 : 0 }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:GREEN, flexShrink:0 }}/>
        <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:700,
          letterSpacing:"0.14em", color }}>{entry.label}</span>
        <button onClick={() => onRemove(entry.id)}
          style={{ marginLeft:"auto", background:"none", border:"none",
            color:"#334155", cursor:"pointer", padding:2 }}>
          <X size={11}/>
        </button>
      </div>
      {entry.summary && (
        <p style={{ fontFamily:"monospace", fontSize:10, color:"#64748b",
          margin:0, paddingLeft:13, lineHeight:1.5 }}>{entry.summary}</p>
      )}
    </motion.div>
  );
}

// ─── OrbButton ────────────────────────────────────────────────────────────────
function OrbButton({ btn, state, x, y, highlighted, onClick }) {
  const Icon  = ICONS[btn.icon] || Route;
  const color = state === "done"   ? GREEN
              : state === "active" ? (btn.color || CYAN)
              : highlighted        ? (btn.color || CYAN)
              : CYAN;
  const opacity = state === "idle" && !highlighted ? 0.55 : 1;

  return (
    <motion.button
      onClick={onClick}
      title={btn.label}
      animate={{
        x, y,
        scale: state === "active" ? [1, 1.1, 1] : state === "done" ? 1.0 : 1,
        boxShadow: state === "active"
          ? [`0 0 0 ${color}`, `0 0 22px ${color}`, `0 0 0 ${color}`]
          : state === "done"
          ? `0 0 16px ${GREEN}88`
          : highlighted
          ? `0 0 12px ${color}66`
          : `0 0 6px ${color}33`,
      }}
      transition={{
        x: { type:"spring", stiffness:220, damping:24 },
        y: { type:"spring", stiffness:220, damping:24 },
        scale: state === "active"
          ? { repeat:Infinity, duration:1.1, ease:"easeInOut" }
          : { duration:0.25 },
        boxShadow: state === "active"
          ? { repeat:Infinity, duration:1.1, ease:"easeInOut" }
          : { duration:0.3 },
      }}
      style={{
        position:"absolute",
        left:"50%", top:"50%",
        marginLeft:-28, marginTop:-28,
        width:56, height:56,
        borderRadius:"50%",
        background: state === "done" ? "rgba(74,222,128,0.18)"
                  : `${color}${state === "idle" ? "14" : "22"}`,
        border:`2px solid ${color}${state === "idle" && !highlighted ? "66" : "ee"}`,
        color, opacity,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:2,
        cursor:"pointer", zIndex:10,
        userSelect:"none", WebkitTapHighlightColor:"transparent",
        transition:"opacity 0.2s, border-color 0.2s",
      }}
    >
      {state === "done"
        ? <Check size={20} strokeWidth={2.5}/>
        : <Icon  size={17} strokeWidth={1.7}/>
      }
      <span style={{ fontFamily:"monospace", fontSize:6.5,
        letterSpacing:"0.07em", lineHeight:1, opacity:0.9 }}>
        {btn.label.length > 8 ? btn.label.slice(0,8) : btn.label}
      </span>
    </motion.button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OrbeoCommand({
  origin, destination,
  onOriginChange, onDestinationChange,
  onCompute, onToggleLayer, onLocateMe,
  onTransportChange, transportMode,
  mapClickLatLon,
}) {
  const RING_R = 160;
  const N      = BUTTONS.length;

  // Drag
  const [orbPos, setOrbPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight - 220 });
  const dragRef  = useRef(null);
  const dragging = useRef(false);
  const dragStart= useRef({ mx:0, my:0, ox:0, oy:0 });

  const onMouseDown = useCallback((e) => {
    // only drag on the sun / ring — not on buttons
    if (e.target.closest("button:not(.sun-btn)")) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: orbPos.x, oy: orbPos.y };
    e.preventDefault();
  }, [orbPos]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setOrbPos({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // State
  const [activeId,     setActiveId]     = useState(null);
  const [doneIds,      setDoneIds]      = useState({});      // id → true = active
  const [values,       setValues]       = useState({});
  const [history,      setHistory]      = useState([]);
  const [highlighted,  setHighlighted]  = useState({});      // ids to pulse after action
  const [minimized,    setMinimized]    = useState(false);

  // Consume map click into open geocode field
  useEffect(() => {
    if (!mapClickLatLon || !activeId) return;
    const btn = BTN_MAP[activeId];
    if (!btn) return;
    const gf = btn.fields.find(f => f.type === "geocode");
    if (!gf) return;
    const addr = mapClickLatLon.address ||
      `${mapClickLatLon.lat.toFixed(5)}, ${mapClickLatLon.lon.toFixed(5)}`;
    setValues(prev => ({ ...prev, [gf.key]: addr }));
  }, [mapClickLatLon, activeId]);

  // Button click
  const handleSelect = useCallback((id) => {
    const btn = BTN_MAP[id];
    if (!btn) return;

    // Toggle: if already done → deactivate
    if (doneIds[id] && btn.isToggle) {
      setDoneIds(prev => { const n={...prev}; delete n[id]; return n; });
      setHistory(prev => prev.filter(e => e.id !== id));
      // notify parent
      if (id === "traffic")  { onToggleLayer?.("traffic_flow", false); onToggleLayer?.("traffic_incidents", false); }
      if (id === "parking")  onToggleLayer?.("parking", false);
      if (id === "weather")  onToggleLayer?.("weather", false);
      return;
    }
    // If already done (non-toggle) and clicked again → deactivate
    if (doneIds[id] && !btn.isToggle) {
      setDoneIds(prev => { const n={...prev}; delete n[id]; return n; });
      setHistory(prev => prev.filter(e => e.id !== id));
      return;
    }

    // No fields → execute immediately
    if (btn.fields.length === 0) {
      executeBtn(id, {});
      return;
    }

    // Open control panel with defaults
    const defaults = {};
    btn.fields.forEach(f => { if (f.default !== undefined) defaults[f.key] = f.default; });
    setValues(defaults);
    setActiveId(id);
  }, [doneIds, onToggleLayer]);

  const handleFieldChange = useCallback((key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
  }, []);

  // Execute
  const executeBtn = useCallback((id, vals) => {
    const btn = BTN_MAP[id];
    if (!btn) return;

    switch (id) {
      case "locate_me":
        onLocateMe?.();
        break;
      case "origin":
        onOriginChange?.(vals.address || "");
        break;
      case "destination":
        onDestinationChange?.(vals.address || "");
        break;
      case "transport":
        onTransportChange?.(vals.mode || "car");
        break;
      case "compute":
        onCompute?.();
        break;
      case "traffic": {
        const both = !vals.layer || vals.layer === "both";
        const flow = both || vals.layer === "flow";
        const inc  = both || vals.layer === "incidents";
        onToggleLayer?.("traffic_flow",      flow);
        onToggleLayer?.("traffic_incidents", inc);
        break;
      }
      case "parking":
        onToggleLayer?.("parking", true, { radius: Number(vals.radius) || 1500 });
        break;
      case "weather":
        onToggleLayer?.("weather", true);
        break;
      case "share":
        try { navigator.clipboard?.writeText(window.location.href); } catch {}
        break;
      default: break;
    }

    // Build summary
    const summary = btn.fields.map(f => {
      const v = vals[f.key];
      if (!v) return null;
      if (f.type === "select") {
        return f.options?.find(o => o.value === v)?.label || v;
      }
      return v;
    }).filter(Boolean).join(" · ");

    // Mark done, add to history
    setDoneIds(prev => ({ ...prev, [id]: true }));
    setActiveId(null);
    setHistory(prev => {
      const filtered = prev.filter(e => e.id !== id);
      return [{ id, label: btn.label, summary }, ...filtered];
    });

    // Highlight next logical buttons
    const nextIds = btn.nextLogical || [];
    const hl = {};
    nextIds.forEach(nid => { hl[nid] = true; });
    setHighlighted(hl);
    setTimeout(() => setHighlighted({}), 3000);
  }, [onLocateMe, onOriginChange, onDestinationChange, onTransportChange, onCompute, onToggleLayer]);

  const handleExecute = useCallback(() => {
    if (activeId) executeBtn(activeId, values);
  }, [activeId, values, executeBtn]);

  const removeFromHistory = useCallback((id) => {
    setHistory(prev => prev.filter(e => e.id !== id));
    setDoneIds(prev => { const n={...prev}; delete n[id]; return n; });
  }, []);

  // Button positions around ring
  const buttonPositions = BUTTONS.map((btn, i) => {
    const angle = (i * 360 / N - 90) * (Math.PI / 180);
    return {
      btn,
      x: Math.cos(angle) * RING_R,
      y: Math.sin(angle) * RING_R,
    };
  });

  // ── Minimized ──────────────────────────────────────────────────────────────
  if (minimized) {
    return (
      <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:300 }}>
        <button
          onClick={() => setMinimized(false)}
          style={{
            width:52, height:52, borderRadius:"50%",
            background:BG, border:`2px solid ${CYAN}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:CYAN, cursor:"pointer",
            boxShadow:`0 0 20px ${CYAN}66`,
          }}
        >
          <Maximize2 size={18}/>
        </button>
      </div>
    );
  }

  const SIZE = (RING_R + 56) * 2 + 20;   // container width/height

  return (
    <>
      {/* ── Right panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div
            initial={{ opacity:0, x:300 }}
            animate={{ opacity:1, x:0   }}
            exit={{    opacity:0, x:300 }}
            transition={{ type:"spring", stiffness:260, damping:26 }}
            style={{
              position:"fixed", right:16, top:"50%",
              transform:"translateY(-50%)",
              width:260, maxHeight:"72vh", overflowY:"auto",
              background:BG, border:`1px solid ${BORDER}`,
              borderRadius:16, padding:"14px 12px",
              backdropFilter:"blur(20px)", zIndex:150,
              scrollbarWidth:"none",
            }}
          >
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", marginBottom:12 }}>
              <span style={{ fontFamily:"monospace", fontSize:9,
                letterSpacing:"0.25em", color:"#475569" }}>CONFIGURACIÓN ACTIVA</span>
              <span style={{ fontFamily:"monospace", fontSize:9,
                color:GREEN }}>{history.length} PASOS</span>
            </div>
            <AnimatePresence>
              {history.map((entry) => (
                <HistoryCard key={entry.id} entry={entry} onRemove={removeFromHistory}/>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Control panel (above orb) ────────────────────────────────── */}
      <AnimatePresence>
        {activeId && (
          <ControlPanel
            btn={BTN_MAP[activeId]}
            values={values}
            onChange={handleFieldChange}
            onExecute={handleExecute}
            onClose={() => setActiveId(null)}
            orbPos={orbPos}
          />
        )}
      </AnimatePresence>

      {/* ── Orb ──────────────────────────────────────────────────────── */}
      <div
        ref={dragRef}
        onMouseDown={onMouseDown}
        style={{
          position:"fixed",
          left: orbPos.x - SIZE/2,
          top:  orbPos.y - SIZE/2,
          width: SIZE, height: SIZE,
          zIndex:100,
          cursor: dragging.current ? "grabbing" : "grab",
          userSelect:"none",
        }}
      >
        {/* Dashed ring */}
        <svg width={SIZE} height={SIZE}
          style={{ position:"absolute", top:0, left:0, pointerEvents:"none" }}>
          <circle cx={SIZE/2} cy={SIZE/2} r={RING_R}
            fill="none" stroke={CYAN} strokeWidth={1}
            strokeOpacity={0.15} strokeDasharray="5 10"/>
          {activeId && (
            <circle cx={SIZE/2} cy={SIZE/2} r={RING_R}
              fill="none" stroke={BTN_MAP[activeId]?.color || CYAN}
              strokeWidth={1.5} strokeOpacity={0.5}/>
          )}
        </svg>

        {/* Orbit buttons */}
        {buttonPositions.map(({ btn, x, y }) => (
          <OrbButton
            key={btn.id}
            btn={btn}
            state={btnState(btn.id, activeId, doneIds)}
            x={x} y={y}
            highlighted={!!highlighted[btn.id]}
            onClick={() => handleSelect(btn.id)}
          />
        ))}

        {/* Sun / centre */}
        <motion.div
          className="sun-btn"
          animate={{
            boxShadow: activeId
              ? [`0 0 0px ${BTN_MAP[activeId]?.color||CYAN}`,
                 `0 0 36px ${BTN_MAP[activeId]?.color||CYAN}`,
                 `0 0 0px ${BTN_MAP[activeId]?.color||CYAN}`]
              : `0 0 24px ${CYAN}55`,
          }}
          transition={activeId
            ? { repeat:Infinity, duration:0.95, ease:"easeInOut" }
            : { duration:0.4 }
          }
          onClick={() => activeId ? setActiveId(null) : onLocateMe?.()}
          style={{
            position:"absolute",
            left:"50%", top:"50%",
            width:80, height:80,
            marginLeft:-40, marginTop:-40,
            borderRadius:"50%",
            background: BG,
            border:`2.5px solid ${activeId ? (BTN_MAP[activeId]?.color||CYAN) : CYAN}`,
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            cursor:"pointer", zIndex:20,
          }}
        >
          <Navigation size={22}
            color={activeId ? (BTN_MAP[activeId]?.color||CYAN) : CYAN}
            strokeWidth={1.5}/>
          <span style={{ fontFamily:"monospace", fontSize:7,
            letterSpacing:"0.12em", color:"#475569", marginTop:3 }}>
            {activeId ? "ESC" : "ORBEO"}
          </span>
        </motion.div>

        {/* Minimise */}
        <button
          onClick={() => setMinimized(true)}
          style={{
            position:"absolute", top:8, right:8,
            background:"none", border:"none",
            color:"#334155", cursor:"pointer", padding:4, zIndex:30,
          }}
          title="Minimizar orbe"
        >
          <Minimize2 size={13}/>
        </button>
      </div>

      {/* Global CSS */}
      <style>{`
        @keyframes orbpulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.35; transform:scale(0.65); }
        }
      `}</style>
    </>
  );
}
