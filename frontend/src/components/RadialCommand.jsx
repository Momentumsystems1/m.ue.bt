import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Route,
  Layers,
  Compass,
  ParkingCircle,
  Utensils,
  Bike,
  Zap,
  AlertTriangle,
  CloudRain,
  Satellite,
  Crosshair,
  X,
  Plus,
  Trash2,
  LocateFixed,
  Accessibility,
  ArrowLeft,
} from "lucide-react";

const BLUE = "#1a73e8";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const screenCenter = () => {
  if (typeof window === "undefined") return { x: 720, y: 420 };
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
};

function OrbButton({ item, index, total, radius, active, onClick }) {
  const Icon = item.icon;
  const angle = total <= 1 ? -90 : index * (360 / total) - 90;
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;

  return (
    <button
      type="button"
      title={item.desc || item.label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick(item);
      }}
      className="absolute flex items-center justify-center rounded-full border bg-white shadow-lg transition-transform hover:scale-110 active:scale-95 pointer-events-auto"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        width: 58,
        height: 58,
        transform: "translate(-50%, -50%)",
        borderColor: active ? BLUE : "rgba(26,115,232,.38)",
        color: active ? "#fff" : BLUE,
        background: active ? BLUE : "rgba(255,255,255,.98)",
        boxShadow: active
          ? "0 12px 28px rgba(26,115,232,.25), 0 0 0 5px rgba(26,115,232,.12)"
          : "0 12px 30px rgba(15,23,42,.14)",
        zIndex: 20,
      }}
    >
      <Icon size={24} strokeWidth={2.45} />
      <span className="pointer-events-none absolute left-1/2 top-[62px] -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow">
        {item.label}
      </span>
    </button>
  );
}

function ActionLog({ entries = [], onDelete }) {
  return (
    <aside
      className="fixed right-4 top-24 bottom-28 z-[70] hidden w-[360px] overflow-y-auto rounded-[26px] border border-blue-100 bg-white/92 p-4 shadow-[0_22px_80px_rgba(15,23,42,.20)] backdrop-blur-2xl lg:block"
      data-testid="orb-action-log"
    >
      <div className="text-[11px] font-bold uppercase tracking-[.22em] text-blue-600">Conversación con el orbe</div>
      <div className="mt-1 text-[13px] text-slate-600">Cada decisión del usuario queda registrada aquí.</div>
      <div className="mt-4 space-y-2">
        {entries.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-500">Sin acciones todavía.</div>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-900">{entry.title}</div>
                <div className="break-words text-[13px] text-slate-700">{entry.value}</div>
                {entry.meta && <div className="mt-0.5 text-[11px] text-slate-500">{entry.meta}</div>}
              </div>
              <button
                type="button"
                onClick={() => onDelete && onDelete(entry)}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
                title="Borrar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function NavigatorPanel({
  userName,
  origin,
  destination,
  position,
  onStartPicking,
  onSetPointFromText,
  onCompute,
  onClose,
  onMultiRouteSubmit,
}) {
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [multiMode, setMultiMode] = useState(false);
  const [starts, setStarts] = useState([{ id: 1, name: userName || "Yo", origin: "", useMe: true }]);

  const hasOrigin = Array.isArray(origin);
  const hasDestination = Array.isArray(destination);

  const addStart = () => {
    setStarts((rows) => [...rows, { id: Date.now(), name: `Persona ${rows.length + 1}`, origin: "", useMe: false }]);
  };

  const updateStart = (id, patch) => {
    setStarts((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const submitMulti = () => {
    onMultiRouteSubmit &&
      onMultiRouteSubmit({
        destinationQuery: destText,
        items: starts.map((row, index) => ({
          name: row.name || `Ruta ${index + 1}`,
          originQuery: row.origin || "",
          useUserOrigin: !!row.useMe,
        })),
      });
  };

  return (
    <div
      className="fixed z-[75] w-[430px] rounded-[28px] border border-blue-100 bg-white/94 p-5 shadow-[0_24px_90px_rgba(15,23,42,.22)] backdrop-blur-2xl pointer-events-auto"
      data-testid="navigator-panel"
      style={{
        left: clamp((position?.x || screenCenter().x) + 120, 16, (typeof window !== "undefined" ? window.innerWidth : 1400) - 450),
        top: clamp((position?.y || screenCenter().y) - 250, 16, (typeof window !== "undefined" ? window.innerHeight : 900) - 560),
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.22em] text-blue-600">INSTRUCCIÓN</div>
          <div className="mt-1 text-[24px] font-semibold text-slate-950">Navegador</div>
          <div className="mt-1 text-[13px] leading-snug text-slate-600">
            Puedes escribir una dirección o usar <b>pick point</b> con el ratón. El inicio por defecto es tu ubicación.
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
          <X size={16} />
        </button>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Inicio</div>
              <div className="text-[14px] font-semibold text-slate-900">
                {hasOrigin ? `${userName || "Usuario"} · mi ubicación marcada` : "Todavía no hay inicio marcado"}
              </div>
            </div>
            <button type="button" onClick={() => onStartPicking && onStartPicking("origin")} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-2 text-[12px] font-semibold text-blue-700">
              <Crosshair size={14} /> Pick point
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={originText}
              onChange={(event) => setOriginText(event.target.value)}
              placeholder="O escribe inicio"
              className="min-w-0 flex-1 rounded-xl border border-blue-100 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-blue-300"
            />
            <button type="button" onClick={() => originText.trim() && onSetPointFromText && onSetPointFromText("origin", originText)} className="rounded-xl bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white">
              Usar
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Destino</div>
              <div className="text-[14px] font-semibold text-slate-900">{hasDestination ? "Destino marcado en el mapa" : "Pendiente de destino"}</div>
            </div>
            <button type="button" onClick={() => onStartPicking && onStartPicking("destination")} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-2 text-[12px] font-semibold text-blue-700">
              <Crosshair size={14} /> Pick point
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={destText}
              onChange={(event) => setDestText(event.target.value)}
              placeholder="Escribe destino"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-blue-300"
            />
            <button type="button" onClick={() => destText.trim() && onSetPointFromText && onSetPointFromText("destination", destText)} className="rounded-xl bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white">
              Usar
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div>
            <div className="text-[13px] font-semibold text-slate-900">Multi</div>
            <div className="text-[12px] text-slate-600">Varios puntos de inicio para el mismo destino.</div>
          </div>
          <button
            type="button"
            onClick={() => setMultiMode((value) => !value)}
            className={`rounded-full px-4 py-2 text-[12px] font-bold ${multiMode ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
          >
            {multiMode ? "ON" : "OFF"}
          </button>
        </div>

        {multiMode && (
          <div className="rounded-2xl border border-blue-100 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Puntos de inicio</div>
              <button type="button" onClick={addStart} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-blue-700">
                <Plus size={13} /> Añadir
              </button>
            </div>
            <div className="max-h-[190px] space-y-2 overflow-y-auto pr-1">
              {starts.map((row, index) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <input value={row.name} onChange={(event) => updateStart(row.id, { name: event.target.value })} placeholder={`Persona ${index + 1}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none" />
                    <input value={row.origin} onChange={(event) => updateStart(row.id, { origin: event.target.value, useMe: false })} placeholder={row.useMe ? "Mi ubicación" : "Dirección de inicio"} disabled={row.useMe} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none disabled:bg-blue-50 disabled:text-blue-800" />
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
                    <input type="checkbox" checked={row.useMe} onChange={(event) => updateStart(row.id, { useMe: event.target.checked })} />
                    Usar mi ubicación como origen
                  </label>
                </div>
              ))}
            </div>
            <button type="button" onClick={submitMulti} className="mt-3 w-full rounded-xl bg-blue-600 px-3 py-2 text-[13px] font-bold text-white">
              Preparar multi-rutas
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => onCompute && onCompute()}
          className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-[14px] font-bold text-white shadow-[0_10px_30px_rgba(26,115,232,.22)] disabled:bg-slate-300"
          disabled={!hasOrigin || !hasDestination}
        >
          Optimizar ruta
        </button>
      </div>
    </div>
  );
}

export default function RadialCommand({
  origin,
  destination,
  onStartPicking,
  onCompute,
  onToggleLayer,
  onSearchNearby,
  onLocateMe,
  onBootstrapComplete,
  onSetPointFromText,
  onRouteOption,
  onMultiRouteSubmit,
  sideEntries,
  onEntryDelete,
  userProfile,
}) {
  const [bootStage, setBootStage] = useState("auth");
  const [name, setName] = useState("Visitor");
  const [manualLocation, setManualLocation] = useState("Barcelona");
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeMode, setActiveMode] = useState("main");
  const [showNavigator, setShowNavigator] = useState(false);
  const [activeLayers, setActiveLayers] = useState({});
  const [position, setPosition] = useState(() => screenCenter());
  const [dragging, setDragging] = useState(false);
  const suppressClickRef = useRef(false);
  const dragRef = useRef({ startX: 0, startY: 0, x: 0, y: 0, moved: false });

  const userName = userProfile?.name || name || "Usuario";

  const primary = useMemo(
    () => [
      { id: "navigator", label: "Navegador", desc: "Inicio, destino y rutas", icon: Route },
      { id: "nearby", label: "Cerca", desc: "Parking, comer, bicis", icon: Compass },
      { id: "layers", label: "Capas", desc: "Tráfico, clima y satélite", icon: Layers },
      { id: "accessibility", label: "Accesibilidad", desc: "Movilidad inclusiva", icon: Accessibility },
      { id: "locate", label: "Mi posición", desc: "Centrar y marcar mi ubicación", icon: LocateFixed },
    ],
    []
  );

  const nearby = useMemo(
    () => [
      { id: "parking", label: "Parking", desc: "Aparcamientos cercanos", icon: ParkingCircle },
      { id: "food", label: "Comer", desc: "Restaurantes cercanos", icon: Utensils },
      { id: "bikes", label: "Bicis", desc: "Movilidad cercana", icon: Bike },
      { id: "ev", label: "EV", desc: "Cargadores cercanos", icon: Zap },
      { id: "accessibility", label: "PMR", desc: "Accesibilidad cercana", icon: Accessibility },
      { id: "back", label: "Volver", desc: "Menú principal", icon: ArrowLeft },
    ],
    []
  );

  const layers = useMemo(
    () => [
      { id: "traffic", label: "Tráfico", desc: "Azure Traffic Flow", icon: AlertTriangle },
      { id: "incident", label: "Incidencias", desc: "Azure incident tiles", icon: AlertTriangle },
      { id: "weather", label: "Clima", desc: "Azure Weather radar", icon: CloudRain },
      { id: "satellite", label: "Satélite", desc: "Azure imagery", icon: Satellite },
      { id: "parking", label: "Parking", desc: "Capa parking", icon: ParkingCircle },
      { id: "accessibility", label: "PMR", desc: "Accesibilidad urbana", icon: Accessibility },
      { id: "back", label: "Volver", desc: "Menú principal", icon: ArrowLeft },
    ],
    []
  );

  const activeButtons = activeMode === "nearby" ? nearby : activeMode === "layers" ? layers : primary;

  const complete = (useGeolocation) => {
    const payload = { name: name || "Visitor", locationQuery: manualLocation || "Barcelona", useGeolocation };
    setReady(true);
    setExpanded(false);
    setBootStage("ready");
    setTimeout(() => {
      const c = screenCenter();
      setPosition({ x: c.x + 140, y: c.y - 20 });
    }, 120);
    onBootstrapComplete && onBootstrapComplete(payload);
  };

  const startDrag = (event) => {
    if (!ready || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { startX: event.clientX, startY: event.clientY, x: position.x, y: position.y, moved: false };
    setDragging(true);

    const move = (ev) => {
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (Math.hypot(dx, dy) > 4) dragRef.current.moved = true;
      setPosition({
        x: clamp(dragRef.current.x + dx, 90, window.innerWidth - 90),
        y: clamp(dragRef.current.y + dy, 90, window.innerHeight - 90),
      });
    };

    const up = () => {
      if (dragRef.current.moved) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 80);
      }
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const handleButton = useCallback(
    (item) => {
      if (item.id === "back") {
        setActiveMode("main");
        setExpanded(true);
        return;
      }

      if (activeMode === "main") {
        if (item.id === "navigator") {
          setShowNavigator(true);
          onRouteOption && onRouteOption({ id: "navigator-open", label: "Navegador", value: "Panel abierto", desc: "Inicio, destino y multi-ruta" });
          return;
        }
        if (item.id === "nearby") {
          setActiveMode("nearby");
          setExpanded(true);
          return;
        }
        if (item.id === "layers") {
          setActiveMode("layers");
          setExpanded(true);
          return;
        }
        if (item.id === "accessibility") {
          setActiveLayers((prev) => ({ ...prev, accessibility: true }));
          onToggleLayer && onToggleLayer("accessibility", true);
          onRouteOption && onRouteOption({ id: "accessibility-open", label: "Accesibilidad", value: "Capa activada", desc: "Movilidad inclusiva · PMR" });
          return;
        }
        if (item.id === "locate") {
          onLocateMe && onLocateMe();
          onRouteOption && onRouteOption({ id: "locate-me", label: "Mi posición", value: "Centrada", desc: "Ubicación del usuario" });
        }
        return;
      }

      if (activeMode === "nearby") {
        onSearchNearby && onSearchNearby(item.id);
        onRouteOption && onRouteOption({ id: `near-${item.id}`, label: `Cerca · ${item.label}`, value: "Activado", desc: item.desc });
        return;
      }

      if (activeMode === "layers") {
        const next = !activeLayers[item.id];
        setActiveLayers((prev) => ({ ...prev, [item.id]: next }));
        onToggleLayer && onToggleLayer(item.id, next);
      }
    },
    [activeMode, activeLayers, onLocateMe, onRouteOption, onSearchNearby, onToggleLayer]
  );

  if (!ready) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
        <div className="relative flex h-[330px] w-[330px] flex-col items-center justify-center rounded-full border border-white/90 bg-white/84 p-8 text-center shadow-[0_28px_100px_rgba(15,23,42,.22)] backdrop-blur-2xl pointer-events-auto" data-testid="orb-login">
          {bootStage === "auth" ? (
            <>
              <div className="text-[11px] font-bold uppercase tracking-[.28em] text-blue-600">Momentum</div>
              <div className="mt-2 text-[30px] font-semibold tracking-tight text-slate-950">ORBEOS</div>
              <div className="mt-2 max-w-[220px] text-[13px] text-slate-600">Acceso demo para probar navegación operativa.</div>
              <div className="mt-6 grid w-full grid-cols-2 gap-2">
                <button type="button" onClick={() => { setName("Demo user"); setBootStage("profile"); }} className="rounded-full border border-blue-200 bg-white px-3 py-2 text-[12px] font-bold text-blue-700 hover:bg-blue-50">Log in</button>
                <button type="button" onClick={() => { setName("Demo user"); setBootStage("profile"); }} className="rounded-full border border-blue-200 bg-white px-3 py-2 text-[12px] font-bold text-blue-700 hover:bg-blue-50">Sign up</button>
              </div>
              <button type="button" onClick={() => { setName("Visitor"); setBootStage("profile"); }} className="mt-3 w-full rounded-full bg-blue-600 px-3 py-3 text-[13px] font-bold text-white">Visitor demo</button>
            </>
          ) : (
            <>
              <div className="text-[11px] font-bold uppercase tracking-[.24em] text-blue-600">Configurar sesión</div>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre" className="mt-4 w-full rounded-full border border-blue-100 bg-white px-4 py-2 text-center text-[14px] text-slate-900 outline-none focus:border-blue-300" />
              <input value={manualLocation} onChange={(event) => setManualLocation(event.target.value)} placeholder="Ubicación escrita" className="mt-2 w-full rounded-full border border-blue-100 bg-white px-4 py-2 text-center text-[14px] text-slate-900 outline-none focus:border-blue-300" />
              <button type="button" onClick={() => complete(true)} className="mt-4 w-full rounded-full bg-blue-600 px-3 py-3 text-[13px] font-bold text-white">Aceptar localización</button>
              <button type="button" onClick={() => complete(false)} className="mt-2 w-full rounded-full border border-blue-200 bg-white px-3 py-2 text-[12px] font-bold text-blue-700">Usar ubicación escrita</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <ActionLog entries={sideEntries || []} onDelete={onEntryDelete} />

      <div
        className="fixed z-[65] h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        data-testid="radial-command"
        style={{ left: position.x, top: position.y }}
      >
        {expanded && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute left-1/2 top-1/2 rounded-full border border-blue-300/70"
              style={{
                width: 296,
                height: 296,
                transform: "translate(-50%, -50%)",
                boxShadow: "0 0 0 1px rgba(255,255,255,.75), inset 0 0 30px rgba(26,115,232,.06)",
              }}
            />
            {activeButtons.map((item, index) => (
              <OrbButton
                key={item.id}
                item={item}
                index={index}
                total={activeButtons.length}
                radius={148}
                active={activeMode !== "main" || !!activeLayers[item.id]}
                onClick={handleButton}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onMouseEnter={() => setExpanded(true)}
          onPointerDown={startDrag}
          onClick={(event) => {
            event.stopPropagation();
            if (suppressClickRef.current) return;
            setExpanded((value) => !value);
            if (activeMode !== "main") setActiveMode("main");
          }}
          className="absolute left-1/2 top-1/2 flex h-[144px] w-[144px] -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center justify-center rounded-full border border-white bg-white/90 text-center shadow-[0_24px_70px_rgba(15,23,42,.20)] backdrop-blur-2xl pointer-events-auto active:cursor-grabbing"
          style={{ color: BLUE, outline: dragging ? "3px solid rgba(26,115,232,.18)" : "none" }}
        >
          <div className="text-[10px] font-bold uppercase tracking-[.25em]">INSTRUCCIÓN</div>
          <div className="mt-1 max-w-[100px] text-[13px] font-semibold leading-tight text-slate-900">
            {activeMode === "main" ? "Pasa el ratón" : activeMode === "nearby" ? "Cerca" : "Capas Azure"}
          </div>
          <div className="mt-1 max-w-[105px] text-[10px] leading-tight text-slate-500">Click abre · arrastra mueve</div>
        </button>
      </div>

      {showNavigator && (
        <NavigatorPanel
          userName={userName}
          origin={origin}
          destination={destination}
          position={position}
          onStartPicking={onStartPicking}
          onSetPointFromText={onSetPointFromText}
          onCompute={onCompute}
          onClose={() => setShowNavigator(false)}
          onMultiRouteSubmit={onMultiRouteSubmit}
        />
      )}
    </>
  );
}
