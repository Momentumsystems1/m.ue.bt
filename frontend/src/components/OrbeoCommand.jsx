/**
 * OrbeoCommand v3 — 3 órbitas concéntricas, orbe grande
 * Órbita 1 (r=130): MI POS · INICIO · DESTINO · MODO TRANSPORTE
 * Órbita 2 (r=230): CALCULAR · TRÁFICO · PARKING · CLIMA
 * Órbita 3 (r=330): MULTIMODAL · EV · BICI · TAXI · COMPARTIR
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation, MapPin, Flag, Car, Route,
  AlertTriangle, ParkingCircle, CloudRain,
  Crosshair, Share2, Zap, Bike, Bus,
  Play, X, Check, Minimize2, Maximize2,
} from "lucide-react";

// ── Icon registry ─────────────────────────────────────────────────────────────
const ICONS = {
  Navigation, MapPin, Flag, Car, Route,
  AlertTriangle, ParkingCircle, CloudRain,
  Crosshair, Share2, Zap, Bike, Bus,
};

// ── Orbit definitions ─────────────────────────────────────────────────────────
const ORBITS = [
  {
    radius: 130,
    buttons: [
      { id:"locate_me",    icon:"Crosshair",     label:"MI POS",   color:"#22d3ee", fields:[], nextLogical:["origin","destination"] },
      { id:"origin",       icon:"MapPin",         label:"INICIO",   color:"#4ade80",
        fields:[{ key:"address", label:"Dirección de inicio", type:"geocode", placeholder:"Escribe o pulsa en el mapa…" }],
        nextLogical:["destination"] },
      { id:"destination",  icon:"Flag",           label:"DESTINO",  color:"#f87171",
        fields:[{ key:"address", label:"Dirección de destino", type:"geocode", placeholder:"Escribe o pulsa en el mapa…" }],
        nextLogical:["transport","compute"] },
      { id:"transport",    icon:"Car",            label:"MODO",     color:"#fbbf24",
        fields:[{ key:"mode", label:"Modo", type:"select",
          options:[
            {value:"car",     label:"🚗 Coche"},
            {value:"foot",    label:"🚶 A pie"},
            {value:"bike",    label:"🚲 Bici"},
            {value:"transit", label:"🚌 Transporte público"},
          ], default:"car" }],
        nextLogical:["compute"] },
    ],
  },
  {
    radius: 230,
    buttons: [
      { id:"compute",   icon:"Route",          label:"CALCULAR", color:"#22c55e", fields:[], nextLogical:["traffic","parking"], requiresBoth:true },
      { id:"traffic",   icon:"AlertTriangle",  label:"TRÁFICO",  color:"#fb923c", isToggle:true,
        fields:[{ key:"layer", label:"Capa", type:"select",
          options:[{value:"both",label:"Flujo + Incidencias"},{value:"flow",label:"Solo flujo"},{value:"incidents",label:"Solo incidencias"}],
          default:"both" }],
        nextLogical:["parking","weather"] },
      { id:"parking",   icon:"ParkingCircle",  label:"PARKING",  color:"#a78bfa", isToggle:true,
        fields:[{ key:"radius", label:"Radio (m)", type:"number", placeholder:"1500", default:"1500" }],
        nextLogical:[] },
      { id:"weather",   icon:"CloudRain",      label:"CLIMA",    color:"#38bdf8", isToggle:true, fields:[], nextLogical:[] },
    ],
  },
  {
    radius: 330,
    buttons: [
      { id:"multimodal", icon:"Bus",         label:"MULTIMODAL", color:"#e879f9", fields:[], nextLogical:[] },
      { id:"ev",         icon:"Zap",         label:"RECARGA EV", color:"#86efac", fields:[], nextLogical:[] },
      { id:"bike",       icon:"Bike",        label:"BICI",       color:"#67e8f9", fields:[], nextLogical:[] },
      { id:"taxi",       icon:"Car",         label:"TAXI/VTC",   color:"#fde68a", fields:[], nextLogical:[] },
      { id:"share",      icon:"Share2",      label:"COMPARTIR",  color:"#94a3b8", fields:[], nextLogical:[] },
    ],
  },
];

// Flat map for quick lookup
const BTN_MAP = {};
ORBITS.forEach(o => o.buttons.forEach(b => { BTN_MAP[b.id] = b; }));

const BG   = "rgba(2,10,20,0.93)";
const CYAN = "#22d3ee";
const GREEN= "#4ade80";

// ── Control panel ─────────────────────────────────────────────────────────────
function ControlPanel({ btn, values, onChange, onExecute, onClose, orbPos }) {
  const color = btn.color || CYAN;
  const left  = Math.min(Math.max(orbPos.x - 170, 12), window.innerWidth - 360);
  const top   = Math.max(orbPos.y - 300, 12);

  return (
    <motion.div
      key={btn.id}
      initial={{ opacity:0, scale:0.86, y:18 }}
      animate={{ opacity:1, scale:1,    y:0  }}
      exit={{   opacity:0, scale:0.82,  y:24 }}
      transition={{ type:"spring", stiffness:360, damping:28 }}
      style={{
        position:"fixed", left, top, width:330,
        background:BG, border:`1.5px solid ${color}`,
        borderRadius:16, padding:"18px 20px 16px",
        backdropFilter:"blur(24px)", zIndex:400,
        boxShadow:`0 0 48px ${color}33, 0 8px 32px rgba(0,0,0,0.7)`,
        pointerEvents:"auto",
      }}
    >
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:color,
            boxShadow:`0 0 8px ${color}`, display:"inline-block",
            animation:"orbpulse 1s ease-in-out infinite" }}/>
          <span style={{ fontFamily:"monospace", fontSize:11, letterSpacing:"0.2em", color, fontWeight:700 }}>
            {btn.label}
          </span>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", padding:4 }}>
          <X size={14}/>
        </button>
      </div>

      {btn.fields.map(field => (
        <div key={field.key} style={{ marginBottom:12 }}>
          <label style={{ display:"block", fontFamily:"monospace", fontSize:9,
            letterSpacing:"0.15em", color:"#64748b", marginBottom:5 }}>
            {field.label.toUpperCase()}
          </label>
          {field.type === "select" ? (
            <select value={values[field.key] ?? field.default ?? ""}
              onChange={e => onChange(field.key, e.target.value)}
              style={{ width:"100%", padding:"8px 10px",
                background:"rgba(34,211,238,0.05)", border:`1px solid rgba(34,211,238,0.2)`,
                borderRadius:8, color:"#e2e8f0", fontFamily:"monospace", fontSize:12,
                outline:"none", cursor:"pointer" }}>
              {field.options.map(o => (
                <option key={o.value} value={o.value} style={{ background:"#0f172a" }}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input type={field.type === "number" ? "number" : "text"}
              value={values[field.key] ?? ""}
              onChange={e => onChange(field.key, e.target.value)}
              placeholder={field.placeholder || ""}
              autoFocus
              style={{ width:"100%", padding:"8px 10px", boxSizing:"border-box",
                background:"rgba(34,211,238,0.05)",
                border:`1px solid ${values[field.key] ? color : "rgba(34,211,238,0.2)"}`,
                borderRadius:8, color:"#e2e8f0", fontFamily:"monospace", fontSize:12, outline:"none" }}/>
          )}
        </div>
      ))}

      {btn.fields.length === 0 && (
        <p style={{ fontFamily:"monospace", fontSize:11, color:"#475569",
          textAlign:"center", margin:"0 0 14px" }}>Sin parámetros — listo para ejecutar</p>
      )}

      <button onClick={onExecute}
        style={{ width:"100%", padding:"10px 0",
          background:`linear-gradient(135deg,${color}22,${color}44)`,
          border:`1.5px solid ${color}`, borderRadius:9, color,
          fontFamily:"monospace", fontSize:11, fontWeight:700, letterSpacing:"0.22em",
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7,
          boxShadow:`0 0 14px ${color}44` }}>
        <Play size={12}/> EJECUTAR
      </button>
    </motion.div>
  );
}

// ── History card ──────────────────────────────────────────────────────────────
function HistoryCard({ entry, onRemove }) {
  const btn   = BTN_MAP[entry.id];
  const color = btn?.color || CYAN;
  return (
    <motion.div layout
      initial={{ opacity:0, x:60, scale:0.9 }}
      animate={{ opacity:1, x:0,  scale:1   }}
      exit={{    opacity:0, x:60, scale:0.85 }}
      transition={{ type:"spring", stiffness:280, damping:24 }}
      style={{ background:`${color}12`, border:`1px solid ${color}44`,
        borderLeft:`3px solid ${color}`, borderRadius:9, padding:"10px 12px",
        marginBottom:7, position:"relative" }}>
      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
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
          margin:"4px 0 0", paddingLeft:13, lineHeight:1.5 }}>{entry.summary}</p>
      )}
    </motion.div>
  );
}

// ── Orbit button ──────────────────────────────────────────────────────────────
function OrbBtn({ btn, state, x, y, highlighted, size, onClick }) {
  const Icon  = ICONS[btn.icon] || Navigation;
  const color = state === "done"    ? GREEN
              : state === "active"  ? (btn.color || CYAN)
              : highlighted         ? (btn.color || CYAN)
              : CYAN;
  const opacity = state === "idle" && !highlighted ? 0.5 : 1;

  return (
    <motion.button
      onClick={onClick}
      title={btn.label}
      animate={{
        x, y,
        scale: state === "active" ? [1,1.12,1] : 1,
        boxShadow: state === "active"
          ? [`0 0 0px ${color}`,`0 0 22px ${color}`,`0 0 0px ${color}`]
          : state === "done" ? `0 0 18px ${GREEN}88`
          : highlighted     ? `0 0 14px ${color}66`
          : `0 0 6px ${color}22`,
      }}
      transition={{
        x:{ type:"spring", stiffness:240, damping:26 },
        y:{ type:"spring", stiffness:240, damping:26 },
        scale: state==="active" ? { repeat:Infinity, duration:1.1, ease:"easeInOut" } : { duration:0.2 },
        boxShadow: state==="active" ? { repeat:Infinity, duration:1.1 } : { duration:0.3 },
      }}
      style={{
        position:"absolute", left:"50%", top:"50%",
        marginLeft:-(size/2), marginTop:-(size/2),
        width:size, height:size, borderRadius:"50%",
        background: state==="done" ? "rgba(74,222,128,0.18)" : `${color}${state==="idle"&&!highlighted?"12":"22"}`,
        border:`${size>54?2:1.5}px solid ${color}${state==="idle"&&!highlighted?"55":"dd"}`,
        color, opacity,
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2,
        cursor:"pointer", zIndex:10, userSelect:"none",
      }}
    >
      {state==="done"
        ? <Check size={size>54?20:14} strokeWidth={2.5}/>
        : <Icon  size={size>54?18:13} strokeWidth={1.7}/>
      }
      <span style={{ fontFamily:"monospace",
        fontSize: size>54 ? 7 : 6,
        letterSpacing:"0.06em", lineHeight:1, opacity:0.9 }}>
        {btn.label.length>9 ? btn.label.slice(0,9) : btn.label}
      </span>
    </motion.button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OrbeoCommand({
  origin, destination,
  onOriginChange, onDestinationChange,
  onCompute, onToggleLayer, onLocateMe,
  onTransportChange, transportMode,
  mapClickLatLon,
}) {
  // Drag
  const [orbPos, setOrbPos] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight - 380,
  });
  const dragging  = useRef(false);
  const dragStart = useRef({ mx:0, my:0, ox:0, oy:0 });

  const onMouseDown = useCallback(e => {
    if (e.target.closest("button:not(.orb-sun)")) return;
    dragging.current = true;
    dragStart.current = { mx:e.clientX, my:e.clientY, ox:orbPos.x, oy:orbPos.y };
    e.preventDefault();
  }, [orbPos]);

  useEffect(() => {
    const mv = e => {
      if (!dragging.current) return;
      setOrbPos({
        x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
        y: dragStart.current.oy + (e.clientY - dragStart.current.my),
      });
    };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  // State
  const [activeId,    setActiveId]    = useState(null);
  const [doneIds,     setDoneIds]     = useState({});
  const [values,      setValues]      = useState({});
  const [history,     setHistory]     = useState([]);
  const [highlighted, setHighlighted] = useState({});
  const [minimized,   setMinimized]   = useState(false);

  // Map click → geocode field
  useEffect(() => {
    if (!mapClickLatLon || !activeId) return;
    const btn = BTN_MAP[activeId];
    const gf  = btn?.fields?.find(f => f.type === "geocode");
    if (!gf) return;
    const addr = mapClickLatLon.address ||
      `${mapClickLatLon.lat.toFixed(5)},${mapClickLatLon.lon.toFixed(5)}`;
    setValues(prev => ({ ...prev, [gf.key]: addr }));
  }, [mapClickLatLon, activeId]);

  // Execute
  const executeBtn = useCallback((id, vals) => {
    const btn = BTN_MAP[id];
    if (!btn) return;

    // Toggle off
    if (doneIds[id] && btn.isToggle) {
      setDoneIds(prev => { const n={...prev}; delete n[id]; return n; });
      setHistory(prev => prev.filter(e => e.id !== id));
      if (id==="traffic") { onToggleLayer?.("traffic_flow",false); onToggleLayer?.("traffic_incidents",false); }
      if (id==="parking") onToggleLayer?.("parking",false);
      if (id==="weather") onToggleLayer?.("weather",false);
      return;
    }

    switch (id) {
      case "locate_me":    onLocateMe?.(); break;
      case "origin":       onOriginChange?.(vals.address||""); break;
      case "destination":  onDestinationChange?.(vals.address||""); break;
      case "transport":    onTransportChange?.(vals.mode||"car"); break;
      case "compute":      onCompute?.(); break;
      case "traffic": {
        const flow = !vals.layer || vals.layer==="both" || vals.layer==="flow";
        const inc  = !vals.layer || vals.layer==="both" || vals.layer==="incidents";
        onToggleLayer?.("traffic_flow",flow);
        onToggleLayer?.("traffic_incidents",inc);
        break;
      }
      case "parking":  onToggleLayer?.("parking",true,{ radius:Number(vals.radius)||1500 }); break;
      case "weather":  onToggleLayer?.("weather",true); break;
      case "share":    try { navigator.clipboard?.writeText(window.location.href); } catch {} break;
      default: break;
    }

    const summary = btn.fields.map(f => {
      const v = vals[f.key];
      if (!v) return null;
      return f.type==="select" ? (f.options?.find(o=>o.value===v)?.label||v) : v;
    }).filter(Boolean).join(" · ");

    setDoneIds(prev => ({ ...prev, [id]:true }));
    setActiveId(null);
    setHistory(prev => [{ id, label:btn.label, summary }, ...prev.filter(e=>e.id!==id)]);

    const hl = {};
    (btn.nextLogical||[]).forEach(nid => { hl[nid]=true; });
    setHighlighted(hl);
    setTimeout(() => setHighlighted({}), 3500);
  }, [doneIds, onLocateMe, onOriginChange, onDestinationChange, onTransportChange,
      onCompute, onToggleLayer]);

  const handleSelect = useCallback(id => {
    const btn = BTN_MAP[id];
    if (!btn) return;
    // Toggle off done non-toggle
    if (doneIds[id] && !btn.isToggle) {
      setDoneIds(prev => { const n={...prev}; delete n[id]; return n; });
      setHistory(prev => prev.filter(e=>e.id!==id));
      return;
    }
    if (btn.fields.length === 0) { executeBtn(id, {}); return; }
    const defaults = {};
    btn.fields.forEach(f => { if (f.default!==undefined) defaults[f.key]=f.default; });
    setValues(defaults);
    setActiveId(id);
  }, [doneIds, executeBtn]);

  const handleExecute = useCallback(() => {
    if (activeId) executeBtn(activeId, values);
  }, [activeId, values, executeBtn]);

  const removeHistory = useCallback(id => {
    setHistory(prev => prev.filter(e=>e.id!==id));
    setDoneIds(prev => { const n={...prev}; delete n[id]; return n; });
  }, []);

  // Compute all button positions
  const allButtons = ORBITS.flatMap((orbit, oi) =>
    orbit.buttons.map((btn, bi) => {
      const n     = orbit.buttons.length;
      const angle = (bi * 360/n - 90) * (Math.PI/180);
      const size  = oi===0 ? 62 : oi===1 ? 54 : 46;
      return { btn, x:Math.cos(angle)*orbit.radius, y:Math.sin(angle)*orbit.radius, size, orbitIdx:oi };
    })
  );

  const SIZE = (330+46)*2+40;  // fits outer orbit + button

  if (minimized) return (
    <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:500 }}>
      <button onClick={() => setMinimized(false)}
        style={{ width:60, height:60, borderRadius:"50%", background:BG,
          border:`2px solid ${CYAN}`, display:"flex", alignItems:"center", justifyContent:"center",
          color:CYAN, cursor:"pointer", boxShadow:`0 0 24px ${CYAN}66` }}>
        <Maximize2 size={20}/>
      </button>
    </div>
  );

  return (
    <>
      {/* Right panel */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div
            initial={{ opacity:0, x:300 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:300 }}
            transition={{ type:"spring", stiffness:260, damping:26 }}
            style={{ position:"fixed", right:16, top:"50%", transform:"translateY(-50%)",
              width:270, maxHeight:"72vh", overflowY:"auto",
              background:BG, border:`1px solid rgba(34,211,238,0.2)`,
              borderRadius:16, padding:"14px 12px", backdropFilter:"blur(20px)", zIndex:300,
              scrollbarWidth:"none" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <span style={{ fontFamily:"monospace", fontSize:9, letterSpacing:"0.25em", color:"#475569" }}>
                CONFIGURACIÓN ACTIVA
              </span>
              <span style={{ fontFamily:"monospace", fontSize:9, color:GREEN }}>{history.length} PASOS</span>
            </div>
            <AnimatePresence>
              {history.map(e => <HistoryCard key={e.id} entry={e} onRemove={removeHistory}/>)}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control panel */}
      <AnimatePresence>
        {activeId && (
          <ControlPanel
            btn={BTN_MAP[activeId]} values={values}
            onChange={(k,v) => setValues(prev=>({...prev,[k]:v}))}
            onExecute={handleExecute}
            onClose={() => setActiveId(null)}
            orbPos={orbPos}
          />
        )}
      </AnimatePresence>

      {/* Orb container */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position:"fixed",
          left: orbPos.x - SIZE/2,
          top:  orbPos.y - SIZE/2,
          width:SIZE, height:SIZE,
          zIndex:200,
          cursor: dragging.current ? "grabbing" : "grab",
          userSelect:"none",
        }}
      >
        {/* SVG rings */}
        <svg width={SIZE} height={SIZE}
          style={{ position:"absolute", top:0, left:0, pointerEvents:"none" }}>
          {ORBITS.map((orbit, i) => (
            <circle key={i}
              cx={SIZE/2} cy={SIZE/2} r={orbit.radius}
              fill="none" stroke={CYAN}
              strokeWidth={i===0?1.5:i===1?1:0.7}
              strokeOpacity={i===0?0.25:i===1?0.15:0.1}
              strokeDasharray={i===0?"6 8":i===1?"4 12":"3 16"}
            />
          ))}
          {/* Active orbit highlight */}
          {activeId && (() => {
            const orbitIdx = ORBITS.findIndex(o => o.buttons.some(b=>b.id===activeId));
            if (orbitIdx<0) return null;
            const r = ORBITS[orbitIdx].radius;
            const color = BTN_MAP[activeId]?.color||CYAN;
            return (
              <circle cx={SIZE/2} cy={SIZE/2} r={r}
                fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.55}/>
            );
          })()}
        </svg>

        {/* All orbit buttons */}
        {allButtons.map(({ btn, x, y, size }) => (
          <OrbBtn
            key={btn.id} btn={btn} size={size}
            state={btn.id===activeId?"active":doneIds[btn.id]?"done":"idle"}
            x={x} y={y}
            highlighted={!!highlighted[btn.id]}
            onClick={() => handleSelect(btn.id)}
          />
        ))}

        {/* Sun — centre */}
        <motion.div
          className="orb-sun"
          animate={{
            boxShadow: activeId
              ? [`0 0 0px ${BTN_MAP[activeId]?.color||CYAN}`,
                 `0 0 50px ${BTN_MAP[activeId]?.color||CYAN}`,
                 `0 0 0px ${BTN_MAP[activeId]?.color||CYAN}`]
              : `0 0 30px ${CYAN}55`,
          }}
          transition={activeId
            ? { repeat:Infinity, duration:0.95, ease:"easeInOut" }
            : { duration:0.4 }}
          onClick={() => activeId ? setActiveId(null) : onLocateMe?.()}
          style={{
            position:"absolute", left:"50%", top:"50%",
            width:100, height:100, marginLeft:-50, marginTop:-50,
            borderRadius:"50%", background:BG,
            border:`3px solid ${activeId?(BTN_MAP[activeId]?.color||CYAN):CYAN}`,
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            cursor:"pointer", zIndex:20,
          }}
        >
          <Navigation size={28}
            color={activeId?(BTN_MAP[activeId]?.color||CYAN):CYAN}
            strokeWidth={1.5}/>
          <span style={{ fontFamily:"monospace", fontSize:8, letterSpacing:"0.15em",
            color:"#475569", marginTop:4 }}>
            {activeId?"ESC":"ORBEO"}
          </span>
        </motion.div>

        {/* Minimise button */}
        <button
          onClick={() => setMinimized(true)}
          style={{ position:"absolute", top:10, right:10,
            background:"none", border:"none", color:"#334155",
            cursor:"pointer", padding:4, zIndex:30 }}
          title="Minimizar">
          <Minimize2 size={13}/>
        </button>
      </div>

      <style>{`
        @keyframes orbpulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.3;transform:scale(0.6)}
        }
      `}</style>
    </>
  );
}
