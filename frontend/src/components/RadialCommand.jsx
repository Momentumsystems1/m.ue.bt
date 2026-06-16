import React, { useMemo, useRef, useState } from "react";
import {
  Route, Layers, Compass, ParkingCircle, Utensils, Bike, Zap,
  AlertTriangle, CloudRain, Satellite, Accessibility, Crosshair,
  X, Plus, Trash2, LocateFixed, ArrowLeft, Flag, MapPin,
} from "lucide-react";

const BLUE = "#1a73e8";
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const viewport = () => ({ w: typeof window !== "undefined" ? window.innerWidth : 1440, h: typeof window !== "undefined" ? window.innerHeight : 900 });
const screenCenter = () => { const s = viewport(); return { x: s.w / 2, y: s.h / 2 }; };

function OrbButton({ item, index, total, radius, active, orbitRotation, onClick }) {
  const Icon = item.icon;
  const angle = total <= 1 ? -90 : index * (360 / total) - 90;
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;

  return (
    <div
      className="absolute"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: `translate(-50%, -50%) rotate(${-orbitRotation}deg)`,
        transition: "transform 560ms cubic-bezier(.2,.8,.2,1), left 560ms cubic-bezier(.2,.8,.2,1), top 560ms cubic-bezier(.2,.8,.2,1)",
        zIndex: 100010,
        pointerEvents: "auto",
      }}
    >
      <button
        type="button"
        title={item.desc || item.label}
        onPointerDown={(e) => { e.stopPropagation(); }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(item); }}
        className="rounded-full border transition-transform hover:scale-110 active:scale-95"
        style={{
          width: 64,
          height: 64,
          display: "grid",
          placeItems: "center",
          padding: 0,
          lineHeight: 1,
          borderWidth: 2,
          borderColor: active ? BLUE : "rgba(26,115,232,.42)",
          color: active ? "#fff" : BLUE,
          background: active ? BLUE : "rgba(255,255,255,.98)",
          boxShadow: active
            ? "0 14px 32px rgba(26,115,232,.28), 0 0 0 6px rgba(26,115,232,.12)"
            : "0 14px 34px rgba(15,23,42,.16)",
          cursor: "pointer",
        }}
      >
        <Icon size={28} strokeWidth={2.45} style={{ display: "block" }} />
      </button>
      <span
        style={{
          position: "absolute",
          left: "50%",
          top: 70,
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          borderRadius: 999,
          background: "rgba(255,255,255,.97)",
          padding: "3px 8px",
          fontSize: 10,
          fontWeight: 800,
          color: "#334155",
          boxShadow: "0 8px 18px rgba(15,23,42,.12)",
          pointerEvents: "none",
        }}
      >
        {item.label}
      </span>
    </div>
  );
}

function NavigatorControls({
  userName, origin, destination,
  onStartPicking, onSetPointFromText, onCompute, onMultiRouteSubmit,
}) {
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [multiMode, setMultiMode] = useState(false);
  const [starts, setStarts] = useState([{ id: 1, name: userName || "Yo", origin: "", useMe: true }]);

  const hasOrigin = Array.isArray(origin);
  const hasDestination = Array.isArray(destination);
  const addStart = () => setStarts((rows) => [...rows, { id: Date.now(), name: `Persona ${rows.length + 1}`, origin: "", useMe: false }]);
  const updateStart = (id, patch) => setStarts((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const submitMulti = () => {
    onMultiRouteSubmit && onMultiRouteSubmit({
      destinationQuery: destText,
      items: starts.map((row, index) => ({
        name: row.name || `Ruta ${index + 1}`,
        originQuery: row.origin || "",
        useUserOrigin: !!row.useMe,
      })),
    });
  };

  return (
    <div className="mb-4 rounded-[24px] border border-blue-100 bg-white/50 p-3">
      <div className="flex items-start gap-2">
        <Route className="mt-1 h-5 w-5 text-blue-600" />
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.22em] text-blue-600">Navegador</div>
          <div className="text-[12px] leading-snug text-slate-600">Inicio/destino pasan ahora al panel derecho. El inicio por defecto es tu ubicación.</div>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Inicio · Punto 1</div>
              <div className="text-[13px] font-semibold text-slate-900">{hasOrigin ? `${userName || "Usuario"} marcado` : "Sin inicio marcado"}</div>
            </div>
            <button type="button" onClick={() => onStartPicking && onStartPicking("origin")} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-2 text-[12px] font-semibold text-blue-700">
              <MapPin size={14} /> Pick point
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <input value={originText} onChange={(e) => setOriginText(e.target.value)} placeholder="Escribe inicio" className="min-w-0 flex-1 rounded-xl border border-blue-100 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-blue-300" />
            <button type="button" onClick={() => originText.trim() && onSetPointFromText && onSetPointFromText("origin", originText)} className="rounded-xl bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white">Usar</button>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Destino · Punto 2</div>
              <div className="text-[13px] font-semibold text-slate-900">{hasDestination ? "Bandera de llegada marcada" : "Sin destino"}</div>
            </div>
            <button type="button" onClick={() => onStartPicking && onStartPicking("destination")} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-3 py-2 text-[12px] font-semibold text-amber-700">
              <Flag size={14} /> Pick point
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <input value={destText} onChange={(e) => setDestText(e.target.value)} placeholder="Escribe destino" className="min-w-0 flex-1 rounded-xl border border-amber-100 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-amber-300" />
            <button type="button" onClick={() => destText.trim() && onSetPointFromText && onSetPointFromText("destination", destText)} className="rounded-xl bg-amber-500 px-3 py-2 text-[12px] font-semibold text-white">Usar</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/60 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-slate-900">Multi</div>
              <div className="text-[12px] text-slate-600">Varios puntos de inicio para el mismo destino.</div>
            </div>
            <button type="button" onClick={() => setMultiMode((v) => !v)} className={`rounded-full px-4 py-2 text-[12px] font-bold ${multiMode ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{multiMode ? "ON" : "OFF"}</button>
          </div>
          {multiMode && (
            <div className="mt-3 space-y-2">
              {starts.map((row, index) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                  <div className="grid grid-cols-[112px_1fr] gap-2">
                    <input value={row.name} onChange={(e) => updateStart(row.id, { name: e.target.value })} placeholder={`Persona ${index + 1}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none" />
                    <input value={row.origin} disabled={row.useMe} onChange={(e) => updateStart(row.id, { origin: e.target.value, useMe: false })} placeholder={row.useMe ? "Mi ubicación" : "Dirección inicio"} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none disabled:bg-blue-50 disabled:text-blue-800" />
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={row.useMe} onChange={(e) => updateStart(row.id, { useMe: e.target.checked })} /> Usar mi ubicación</label>
                </div>
              ))}
              <div className="flex gap-2">
                <button type="button" onClick={addStart} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-2 text-[12px] font-semibold text-blue-700"><Plus size={13} /> Añadir</button>
                <button type="button" onClick={submitMulti} className="ml-auto rounded-xl bg-blue-600 px-3 py-2 text-[12px] font-bold text-white">Preparar</button>
              </div>
            </div>
          )}
        </div>

        <button type="button" onClick={() => onCompute && onCompute()} className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-[14px] font-bold text-white shadow-[0_10px_30px_rgba(26,115,232,.22)] disabled:bg-slate-300" disabled={!hasOrigin || !hasDestination}>Optimizar ruta</button>
      </div>
    </div>
  );
}

function RightPanel({ entries = [], onDelete, showNavigator, onCloseNavigator, navigatorProps }) {
  return (
    <aside className="glass-liquid fixed right-4 top-24 bottom-28 z-[100000] hidden w-[385px] overflow-y-auto rounded-[28px] p-4 lg:block" data-testid="orb-right-panel">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.22em] text-blue-600">Panel operativo</div>
          <div className="mt-1 text-[13px] text-slate-600">Navegador, acciones y capas del orbe.</div>
        </div>
        {showNavigator && <button type="button" onClick={onCloseNavigator} className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-600 hover:bg-white"><X size={16} /></button>}
      </div>

      {showNavigator && <NavigatorControls {...navigatorProps} />}

      <div className="text-[10px] font-bold uppercase tracking-[.22em] text-slate-500">Conversación</div>
      <div className="mt-3 space-y-2">
        {entries.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white/60 p-3 text-[13px] text-slate-500">Sin acciones todavía.</div>}
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-white/70 bg-white/64 p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-900">{entry.title}</div>
                <div className="break-words text-[13px] text-slate-700">{entry.value}</div>
                {entry.meta && <div className="mt-0.5 text-[11px] text-slate-500">{entry.meta}</div>}
              </div>
              <button type="button" onClick={() => onDelete && onDelete(entry)} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50" title="Borrar"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function RadialCommand({
  origin, destination, onStartPicking, onCompute, onToggleLayer,
  onSearchNearby, onLocateMe, onBootstrapComplete, onSetPointFromText,
  onRouteOption, onMultiRouteSubmit, sideEntries, onEntryDelete, userProfile,
}) {
  const [bootStage, setBootStage] = useState("auth");
  const [name, setName] = useState("Visitor");
  const [manualLocation, setManualLocation] = useState("Barcelona");
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeMode, setActiveMode] = useState("main");
  const [showNavigator, setShowNavigator] = useState(false);
  const [activeLayers, setActiveLayers] = useState({});
  const [position, setPosition] = useState(() => { const c = screenCenter(); return { x: c.x + 80, y: c.y }; });
  const [dragging, setDragging] = useState(false);
  const movedRef = useRef(false);
  const userName = userProfile?.name || name || "Usuario";

  const primary = useMemo(() => [
    { id: "navigator", label: "Navegador", desc: "Inicio, destino y rutas", icon: Route },
    { id: "nearby", label: "Cerca", desc: "Parking, comer, bicis", icon: Compass },
    { id: "layers", label: "Capas", desc: "Tráfico, satélite, clima", icon: Layers },
    { id: "accessibility", label: "PMR", desc: "Movilidad inclusiva", icon: Accessibility },
    { id: "locate", label: "Mi posición", desc: "Centrar y marcar mi ubicación", icon: LocateFixed },
  ], []);
  const nearby = useMemo(() => [
    { id: "parking", label: "Parking", desc: "Aparcamientos cercanos", icon: ParkingCircle },
    { id: "food", label: "Comer", desc: "Restaurantes cercanos", icon: Utensils },
    { id: "bikes", label: "Bicis", desc: "Movilidad cercana", icon: Bike },
    { id: "ev", label: "EV", desc: "Cargadores cercanos", icon: Zap },
    { id: "back", label: "Volver", desc: "Menú principal", icon: ArrowLeft },
  ], []);
  const layers = useMemo(() => [
    { id: "traffic", label: "Tráfico", desc: "Flujo Azure / fallback", icon: AlertTriangle },
    { id: "incident", label: "Incidencias", desc: "Incidencias Azure / DGT", icon: AlertTriangle },
    { id: "weather", label: "Clima", desc: "Radar clima", icon: CloudRain },
    { id: "satellite", label: "Satélite", desc: "Vista satélite", icon: Satellite },
    { id: "accessibility", label: "PMR", desc: "Accesibilidad", icon: Accessibility },
    { id: "back", label: "Volver", desc: "Menú principal", icon: ArrowLeft },
  ], []);

  const activeButtons = activeMode === "nearby" ? nearby : activeMode === "layers" ? layers : primary;
  const orbitRotation = activeMode === "main" ? 0 : activeMode === "nearby" ? 72 : 144;

  const complete = (useGeolocation) => {
    const payload = { name: name || "Visitor", locationQuery: manualLocation || "Barcelona", useGeolocation };
    setReady(true); setExpanded(false); setBootStage("ready");
    const c = screenCenter(); setPosition({ x: c.x + 140, y: c.y - 20 });
    onBootstrapComplete && onBootstrapComplete(payload);
  };

  const startDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY, ox: position.x, oy: position.y };
    movedRef.current = false; setDragging(true);
    const move = (ev) => {
      const dx = ev.clientX - start.x; const dy = ev.clientY - start.y;
      if (Math.hypot(dx, dy) > 3) movedRef.current = true;
      const s = viewport();
      setPosition({ x: clamp(start.ox + dx, 86, s.w - 86), y: clamp(start.oy + dy, 86, s.h - 86) });
    };
    const up = () => { setDragging(false); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  const setModeWithRotation = (mode) => {
    setActiveMode(mode);
    setExpanded(true);
  };

  const fireLayer = (id) => {
    const next = !activeLayers[id];
    setActiveLayers((prev) => ({ ...prev, [id]: next }));
    onToggleLayer && onToggleLayer(id, next);
    onRouteOption && onRouteOption({ id: `layer-${id}`, label: `Capa · ${id}`, value: next ? "Activada" : "Desactivada", desc: "Cambio desde orbe" });
  };

  const handleButton = (item) => {
    if (item.id === "back") { setModeWithRotation("main"); return; }
    if (activeMode === "main") {
      if (item.id === "navigator") { setShowNavigator(true); onRouteOption && onRouteOption({ id: "navigator-open", label: "Navegador", value: "Panel derecho abierto", desc: "Inicio, destino y multi-ruta" }); return; }
      if (item.id === "nearby") { setModeWithRotation("nearby"); return; }
      if (item.id === "layers") { setModeWithRotation("layers"); return; }
      if (item.id === "accessibility") { fireLayer("accessibility"); return; }
      if (item.id === "locate") { onLocateMe && onLocateMe(); onRouteOption && onRouteOption({ id: "locate-me", label: "Mi posición", value: "Centrada", desc: "Ubicación del usuario" }); }
      return;
    }
    if (activeMode === "nearby") { onSearchNearby && onSearchNearby(item.id); onRouteOption && onRouteOption({ id: `near-${item.id}`, label: `Cerca · ${item.label}`, value: "Activado", desc: item.desc }); return; }
    if (activeMode === "layers") fireLayer(item.id);
  };

  if (!ready) {
    return (
      <div className="fixed inset-0 z-[100000] flex items-center justify-center pointer-events-none">
        <div className="glass-liquid relative flex h-[330px] w-[330px] flex-col items-center justify-center rounded-full p-8 text-center pointer-events-auto" data-testid="orb-login">
          {bootStage === "auth" ? <>
            <div className="text-[11px] font-bold uppercase tracking-[.28em] text-blue-600">Momentum</div><div className="mt-2 text-[30px] font-semibold tracking-tight text-slate-950">ORBEOS</div><div className="mt-2 max-w-[220px] text-[13px] text-slate-600">Acceso demo para probar navegación operativa.</div>
            <div className="mt-6 grid w-full grid-cols-2 gap-2"><button type="button" onClick={() => { setName("Demo user"); setBootStage("profile"); }} className="rounded-full border border-blue-200 bg-white px-3 py-2 text-[12px] font-bold text-blue-700 hover:bg-blue-50">Log in</button><button type="button" onClick={() => { setName("Demo user"); setBootStage("profile"); }} className="rounded-full border border-blue-200 bg-white px-3 py-2 text-[12px] font-bold text-blue-700 hover:bg-blue-50">Sign up</button></div>
            <button type="button" onClick={() => { setName("Visitor"); setBootStage("profile"); }} className="mt-3 w-full rounded-full bg-blue-600 px-3 py-3 text-[13px] font-bold text-white">Visitor demo</button>
          </> : <>
            <div className="text-[11px] font-bold uppercase tracking-[.24em] text-blue-600">Configurar sesión</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="mt-4 w-full rounded-full border border-blue-100 bg-white px-4 py-2 text-center text-[14px] text-slate-900 outline-none focus:border-blue-300" />
            <input value={manualLocation} onChange={(e) => setManualLocation(e.target.value)} placeholder="Ubicación escrita" className="mt-2 w-full rounded-full border border-blue-100 bg-white px-4 py-2 text-center text-[14px] text-slate-900 outline-none focus:border-blue-300" />
            <button type="button" onClick={() => complete(true)} className="mt-4 w-full rounded-full bg-blue-600 px-3 py-3 text-[13px] font-bold text-white">Aceptar localización</button>
            <button type="button" onClick={() => complete(false)} className="mt-2 w-full rounded-full border border-blue-200 bg-white px-3 py-2 text-[12px] font-bold text-blue-700">Usar ubicación escrita</button>
          </>}
        </div>
      </div>
    );
  }

  return (
    <>
      <RightPanel
        entries={sideEntries || []}
        onDelete={onEntryDelete}
        showNavigator={showNavigator}
        onCloseNavigator={() => setShowNavigator(false)}
        navigatorProps={{ userName, origin, destination, onStartPicking, onSetPointFromText, onCompute, onMultiRouteSubmit }}
      />
      <div className="fixed h-[570px] w-[570px] -translate-x-1/2 -translate-y-1/2" data-testid="radial-command" style={{ left: position.x, top: position.y, zIndex: 100000, pointerEvents: "none" }}>
        {expanded && <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
          <div className="absolute left-1/2 top-1/2 rounded-full border border-blue-300/70" style={{ width: 320, height: 320, transform: "translate(-50%, -50%)", boxShadow: "0 0 0 1px rgba(255,255,255,.75), inset 0 0 30px rgba(26,115,232,.06)" }} />
          <div className="absolute inset-0" style={{ transform: `rotate(${orbitRotation}deg)`, transition: "transform 620ms cubic-bezier(.2,.8,.2,1)", transformOrigin: "50% 50%" }}>
            {activeButtons.map((item, index) => <OrbButton key={`${activeMode}-${item.id}`} item={item} index={index} total={activeButtons.length} radius={160} active={activeMode !== "main" || !!activeLayers[item.id]} orbitRotation={orbitRotation} onClick={handleButton} />)}
          </div>
        </div>}
        <button type="button" onMouseEnter={() => setExpanded(true)} onPointerDown={startDrag} onClick={(e) => { e.stopPropagation(); if (movedRef.current) return; setExpanded((v) => !v); if (activeMode !== "main") setModeWithRotation("main"); }} className="glass-liquid absolute left-1/2 top-1/2 flex h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center justify-center rounded-full text-center active:cursor-grabbing" style={{ color: BLUE, pointerEvents: "auto", outline: dragging ? "4px solid rgba(26,115,232,.18)" : "none" }}>
          <div className="text-[10px] font-bold uppercase tracking-[.25em]">INSTRUCCIÓN</div><div className="mt-1 max-w-[100px] text-[13px] font-semibold leading-tight text-slate-900">{activeMode === "main" ? "Pasa el ratón" : activeMode === "nearby" ? "Cerca" : "Capas"}</div><div className="mt-1 max-w-[110px] text-[10px] leading-tight text-slate-500">Click abre · arrastra mueve</div>
        </button>
      </div>
    </>
  );
}
