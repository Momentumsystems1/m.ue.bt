import React, { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, ArrowLeft, ArrowLeftRight, Bike, Bookmark, Car, CloudRain,
  Compass, Crosshair, Flag, HelpCircle, Info, Layers, MapPin, MapPinned,
  Maximize2, Minimize2, Mic, Move, ParkingCircle, Palette, Route, Search,
  ShoppingBag, Trash2, User, Utensils, Wrench, Zap, RotateCcw,
} from "lucide-react";
import { CORE_SKINS, MODES } from "@/lib/radialConfig";

const ICON_MAP = {
  AlertTriangle, ArrowLeft, ArrowLeftRight, Bike, Bookmark, Car, CloudRain,
  Compass, Crosshair, Flag, HelpCircle, Info, Layers, MapPin, MapPinned,
  Maximize2, Minimize2, Mic, Move, ParkingCircle, Palette, Route, Search,
  ShoppingBag, Trash2, User, Utensils, Wrench, Zap, RotateCcw,
};

const SIZE = 430;
const CORE = 118;
const R1 = 142;
const R2 = 202;
const PLANET = 42;
const cyan = "#22d3ee";
const amber = "#fbbf24";
const panel = "rgba(2,10,20,0.88)";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function positionFor(index, total, radius, start = -90) {
  const angle = ((start + index * (360 / Math.max(total, 1))) * Math.PI) / 180;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function RingLine({ radius, color, label }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
      style={{
        width: radius * 2,
        height: radius * 2,
        transform: "translate(-50%, -50%)",
        border: `1px dashed ${color}55`,
        boxShadow: `0 0 22px ${color}11`,
      }}
    >
      <div
        className="absolute left-1/2 -top-5 -translate-x-1/2 font-mono text-[8px] tracking-[0.32em] uppercase"
        style={{ color: `${color}aa` }}
      >
        {label}
      </div>
    </div>
  );
}

function PlanetButton({ item, index, total, radius, color, active, disabled, onHover, onClick }) {
  const Icon = ICON_MAP[item.icon] || Info;
  const { x, y } = positionFor(index, total, radius);
  return (
    <motion.button
      type="button"
      data-testid={`planet-${item.id}`}
      initial={{ opacity: 0, scale: 0.86 }}
      animate={{ opacity: disabled ? 0.34 : 1, scale: active ? 1.08 : 1 }}
      exit={{ opacity: 0, scale: 0.86 }}
      whileHover={{ scale: 1.1 }}
      transition={{ duration: 0.16 }}
      onPointerEnter={() => onHover(item)}
      onPointerLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(item);
      }}
      style={{
        position: "absolute",
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        width: PLANET,
        height: PLANET,
        transform: "translate(-50%, -50%)",
        borderRadius: "999px",
        background: active ? color : panel,
        border: `1.5px solid ${color}`,
        color: active ? "#020a14" : color,
        boxShadow: active ? `0 0 26px ${color}77, inset 0 0 10px #ffffff55` : `0 0 12px ${color}22`,
        cursor: "pointer",
        pointerEvents: "auto",
      }}
    >
      <Icon size={18} strokeWidth={active ? 2.5 : 1.9} />
      <span
        className="absolute left-1/2 -bottom-5 -translate-x-1/2 font-mono text-[8px] tracking-widest whitespace-nowrap uppercase pointer-events-none"
        style={{ color: active ? color : `${color}cc`, textShadow: "0 0 8px #000" }}
      >
        {item.label}
      </span>
    </motion.button>
  );
}

function Core({ skin, minimized, title, subtitle, color, onClick }) {
  if (minimized) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full font-mono text-[10px] tracking-widest font-bold"
        style={{
          width: 58,
          height: 58,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle at 30% 20%, rgba(103,232,249,.65), rgba(2,10,20,.92) 60%)",
          border: "1px solid rgba(103,232,249,.9)",
          color: cyan,
          boxShadow: "0 0 24px rgba(34,211,238,.42)",
          pointerEvents: "auto",
        }}
      >
        CTRL
      </button>
    );
  }

  const crystal = skin === "crystal";
  const minimal = skin === "minimal";
  return (
    <button
      type="button"
      data-testid="radial-core"
      onClick={onClick}
      className="absolute left-1/2 top-1/2 flex flex-col items-center justify-center rounded-full text-center px-4 overflow-hidden"
      style={{
        width: CORE,
        height: CORE,
        transform: "translate(-50%, -50%)",
        background: minimal
          ? "rgba(2,10,20,.94)"
          : crystal
            ? "linear-gradient(135deg, rgba(30,27,75,.82), rgba(2,10,20,.93) 52%, rgba(14,116,144,.62))"
            : "radial-gradient(circle at 30% 22%, rgba(207,250,254,.58), rgba(103,232,249,.26) 32%, rgba(2,10,20,.86) 76%)",
        border: "1.2px solid rgba(165,243,252,.95)",
        boxShadow: "0 0 30px rgba(34,211,238,.38), inset 0 0 22px rgba(103,232,249,.18)",
        color,
        pointerEvents: "auto",
        cursor: "pointer",
      }}
    >
      <div className="absolute top-2 left-5 right-5 h-4 rounded-full bg-white/25 blur-sm pointer-events-none" />
      <AnimatePresence mode="wait">
        <motion.div
          key={title + subtitle}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.16 }}
          className="font-mono uppercase font-bold leading-tight"
          style={{
            color,
            fontSize: title?.length > 10 ? 11 : 14,
            letterSpacing: "0.18em",
            textShadow: `0 0 12px ${color}`,
          }}
        >
          {title}
        </motion.div>
      </AnimatePresence>
      {subtitle && (
        <div className="font-mono text-[8px] leading-tight mt-1 text-cyan-100/75 max-w-[98px]">
          {subtitle}
        </div>
      )}
    </button>
  );
}

function SidePanel({ entries, onEdit, onSave, onDelete }) {
  if (!entries?.length) return null;
  return (
    <div
      data-testid="radial-side-panel"
      className="fixed right-4 top-20 bottom-20 z-40 w-[300px] max-w-[300px] overflow-y-auto pointer-events-none"
    >
      <div className="font-mono text-[9px] tracking-[0.32em] text-cyan-300 px-1 mb-2">CONTEXTO · {entries.length}</div>
      <div className="flex flex-col gap-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="panel-solid p-2.5 pointer-events-auto"
            style={{ borderLeft: `3px solid ${entry.color || cyan}` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-[10px] tracking-widest text-cyan-100 font-bold truncate">{entry.title}</div>
                <div className="font-mono text-[9px] text-cyan-300/80 mt-1 break-words leading-snug">{entry.value}</div>
                {entry.meta && <div className="font-mono text-[8px] text-cyan-500/70 mt-1 italic">{entry.meta}</div>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button className="px-1.5 py-1 border border-cyan-500/30 text-cyan-200" onClick={() => onEdit?.(entry)}>✎</button>
                <button className="px-1.5 py-1 border border-emerald-500/30 text-emerald-300" onClick={() => onSave?.(entry)}>✓</button>
                <button className="px-1.5 py-1 border border-rose-500/30 text-rose-300" onClick={() => onDelete?.(entry)}>×</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RadialCommand({
  origin,
  destination,
  onStartPicking,
  onResetPoints,
  onReversePoints,
  onCompute,
  onToggleLayer,
  onPickInfo,
  onSearchNearby,
  onLocateMe,
  onOpenExpert,
  onGeocoderOpen,
  transportMode,
  onTransportChange,
  resultText,
  sideEntries,
  onEntryEdit,
  onEntrySave,
  onEntryDelete,
}) {
  const [pos, setPos] = useState(() => ({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 720,
    y: typeof window !== "undefined" ? Math.max(315, window.innerHeight / 2) : 420,
  }));
  const [expanded, setExpanded] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [mode, setMode] = useState("main");
  const [hovered, setHovered] = useState(null);
  const [skinIdx, setSkinIdx] = useState(0);
  const [enabledLayers, setEnabledLayers] = useState({});
  const drag = useRef(null);

  const mainItems = MODES.main.orbit1;
  const subItems = mode === "main" ? [] : (MODES[mode]?.orbit2 || []);

  const activeMainId = MODES[mode]?.activeOrbit1;
  const center = useMemo(() => {
    if (hovered) return { title: hovered.label, subtitle: hovered.desc, color: amber };
    if (resultText && mode === "navegador") return { title: "Ruta", subtitle: resultText, color: "#4ade80" };
    if (!expanded) return { title: "Control", subtitle: "Click para abrir", color: cyan };
    if (mode === "main") return { title: "Control", subtitle: "Selecciona módulo", color: cyan };
    return { title: MODES[mode]?.centerLabel || "Control", subtitle: MODES[mode]?.centerHint || "", color: cyan };
  }, [hovered, resultText, mode, expanded]);

  const beginDrag = useCallback((e) => {
    e.preventDefault();
    drag.current = { startX: e.clientX, startY: e.clientY, x: pos.x, y: pos.y };
    const onMove = (ev) => {
      if (!drag.current) return;
      const nextX = drag.current.x + ev.clientX - drag.current.startX;
      const nextY = drag.current.y + ev.clientY - drag.current.startY;
      setPos({
        x: clamp(nextX, 90, window.innerWidth - 90),
        y: clamp(nextY, 105, window.innerHeight - 90),
      });
    };
    const onUp = () => {
      drag.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [pos.x, pos.y]);

  const cycleTransport = () => {
    const modes = ["car", "transit", "bike", "foot", "scooter", "taxi"];
    const i = modes.indexOf(transportMode);
    onTransportChange?.(modes[(i + 1) % modes.length]);
  };

  const runAction = (item) => {
    switch (item.action) {
      case "select_points":
        onStartPicking?.();
        return;
      case "compute":
        onCompute?.();
        return;
      case "reverse_points":
        onReversePoints?.();
        return;
      case "reset":
        onResetPoints?.();
        return;
      case "cycle_transport":
        cycleTransport();
        return;
      case "pick_info":
        onPickInfo?.();
        return;
      case "search_nearby":
        onSearchNearby?.(item.value);
        return;
      case "locate_me":
        onLocateMe?.();
        return;
      case "cycle_skin":
        setSkinIdx((i) => (i + 1) % CORE_SKINS.length);
        return;
      case "minimize":
        setMinimized(true);
        return;
      case "expert_mode":
        onOpenExpert?.();
        return;
      case "open_geocoder":
        onGeocoderOpen?.();
        return;
      default:
        return;
    }
  };

  const selectItem = (item) => {
    if (item.type === "mode") {
      setMode(item.targetMode || "main");
      setExpanded(true);
      return;
    }
    if (item.type === "toggle") {
      const next = !enabledLayers[item.value];
      setEnabledLayers((s) => ({ ...s, [item.value]: next }));
      onToggleLayer?.(item.value, next);
      return;
    }
    runAction(item);
  };

  return (
    <>
      <div
        data-testid="radial-command"
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          width: minimized ? 86 : SIZE,
          height: minimized ? 86 : SIZE,
          transform: "translate(-50%, -50%)",
          zIndex: 60,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {!minimized && (
          <button
            type="button"
            onPointerDown={beginDrag}
            className="absolute left-1/2 top-4 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full border font-mono text-[8px] tracking-[0.22em] uppercase"
            style={{
              color: "#67e8f9",
              borderColor: "rgba(34,211,238,.35)",
              background: "rgba(2,10,20,.82)",
              cursor: "grab",
              pointerEvents: "auto",
              zIndex: 80,
            }}
            title="Mover control"
          >
            <Move size={10} /> mover
          </button>
        )}

        <AnimatePresence>
          {expanded && !minimized && (
            <motion.div
              key="radial-rings"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0"
            >
              <RingLine radius={R1} color={cyan} label="Menú" />
              {mode !== "main" && <RingLine radius={R2} color={amber} label="Acción" />}

              {mainItems.map((item, i) => (
                <PlanetButton
                  key={item.id}
                  item={item}
                  index={i}
                  total={mainItems.length}
                  radius={R1}
                  color={cyan}
                  active={item.id === activeMainId}
                  disabled={mode !== "main" && item.id !== activeMainId}
                  onHover={setHovered}
                  onClick={selectItem}
                />
              ))}

              {subItems.map((item, i) => {
                const active = item.type === "toggle" ? !!enabledLayers[item.value] : false;
                return (
                  <PlanetButton
                    key={item.id}
                    item={item}
                    index={i}
                    total={subItems.length}
                    radius={R2}
                    color={amber}
                    active={active}
                    disabled={false}
                    onHover={setHovered}
                    onClick={selectItem}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <Core
          skin={CORE_SKINS[skinIdx]}
          minimized={minimized}
          title={center.title}
          subtitle={center.subtitle}
          color={center.color}
          onClick={() => {
            if (minimized) {
              setMinimized(false);
              setExpanded(true);
              return;
            }
            setExpanded((v) => !v);
          }}
        />

        {!minimized && (
          <div
            className="absolute left-1/2 flex gap-1.5"
            style={{
              top: `calc(50% + ${CORE / 2 + 18}px)`,
              transform: "translateX(-50%)",
              pointerEvents: "auto",
              zIndex: 80,
            }}
          >
            {mode !== "main" && (
              <button
                type="button"
                onClick={() => { setMode("main"); setHovered(null); }}
                className="px-2 py-1 rounded-full border border-cyan-500/35 bg-[#020a14]/85 font-mono text-[8px] tracking-widest text-cyan-300 uppercase"
              >
                volver
              </button>
            )}
            <button
              type="button"
              onClick={() => setSkinIdx((i) => (i + 1) % CORE_SKINS.length)}
              className="p-1.5 rounded-full border border-cyan-500/35 bg-[#020a14]/85 text-cyan-300"
              title="Cambiar aspecto"
            >
              <Palette size={11} />
            </button>
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="p-1.5 rounded-full border border-cyan-500/35 bg-[#020a14]/85 text-cyan-300"
              title="Minimizar"
            >
              <Minimize2 size={11} />
            </button>
          </div>
        )}

        {(origin || destination) && !minimized && (
          <div
            className="absolute left-1/2 bottom-4 -translate-x-1/2 font-mono text-[8px] tracking-widest uppercase text-cyan-200/80 whitespace-nowrap"
            style={{ pointerEvents: "none" }}
          >
            {origin ? "ORG ✓" : "ORG —"} · {destination ? "DST ✓" : "DST —"}
          </div>
        )}
      </div>

      <SidePanel entries={sideEntries || []} onEdit={onEntryEdit} onSave={onEntrySave} onDelete={onEntryDelete} />
    </>
  );
}
