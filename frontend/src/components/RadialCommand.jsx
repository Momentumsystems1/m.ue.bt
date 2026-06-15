/**
 * RadialCommand — context-driven planetary control with animated orbital reveal.
 *
 *  See `radialConfig.js` for geometric constants and mode definitions.
 *
 *  Reveal sequence:
 *    1. Idle      → sun only ("Inicio").
 *    2. Hover     → ORBIT 1 grows from a point to its full diameter.
 *    3. Pick mode → ORBIT 2 grows.
 *    4. Pick sub  → ORBIT 3 grows IF the sub-action has `steps`.
 *
 *  Step rotation:
 *    When ORBIT 3 is populated with steps, the orbit rotates so the active
 *    step sits at 12 o'clock. As the user advances, the orbit animates to
 *    the next step (60° rotation per step).
 *
 *  Side info panel (right edge of viewport):
 *    Each completed user action emits an entry that the parent stores. Each
 *    card exposes ✏ edit, 💾 save, ✕ delete actions.
 */
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, ParkingCircle, Bike, Zap, CloudRain,
  Car, Bus, Footprints, CarTaxiFront,
  MapPin, Flag, Route, Info, RotateCcw, MapPinned,
  ArrowLeft, ArrowLeftRight, Bookmark, Compass, Search, User, Mic, Clock,
  Layers, Crosshair, HelpCircle, Wrench, Minimize2, Maximize2, Palette,
  Megaphone, Share2, Utensils, ShoppingBag, Check, X as XIcon,
  Pencil, Save, Trash2,
} from "lucide-react";
import {
  MODES, RING_THEME, CORE_SKINS, SUN_DIAMETER, CONTAINER,
  planetsFor, rotationForSlot, indexOfPlanet,
} from "@/lib/radialConfig";

const ICON_MAP = {
  AlertTriangle, ParkingCircle, Bike, Zap, CloudRain,
  Car, Bus, Footprints, CarTaxiFront,
  MapPin, Flag, Route, Info, RotateCcw, MapPinned,
  ArrowLeft, ArrowLeftRight, Bookmark, Compass, Search, User, Mic, Clock,
  Layers, Crosshair, HelpCircle, Wrench, Minimize2, Palette,
  Megaphone, Share2, Utensils, ShoppingBag,
};

/* =====================================================================
   Planet — a small button orbiting a ring at its angular slot.
   ===================================================================== */
function Planet({ planet, idx, ringRotation, theme, accent, dim, hidden, onHover, onSelect }) {
  const Icon = ICON_MAP[planet.icon] || Info;
  const angleDeg = idx * 60 - 90;
  const rad = (angleDeg * Math.PI) / 180;
  const x = Math.cos(rad) * theme.radius;
  const y = Math.sin(rad) * theme.radius;

  return (
    <motion.button
      type="button"
      data-testid={`planet-${planet.id}`}
      onClick={(e) => { e.stopPropagation(); onSelect && onSelect(planet); }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseEnter={() => onHover && onHover(planet)}
      onMouseLeave={() => onHover && onHover(null)}
      animate={{
        opacity: hidden ? 0 : (dim ? 0.32 : 1),
        scale: accent ? 1.2 : 1,
      }}
      whileHover={{ scale: (accent ? 1.2 : 1) * 1.08 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      style={{
        position: "absolute",
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: `translate(-50%, -50%) rotate(${-ringRotation}deg)`,
        width: theme.planet, height: theme.planet,
        borderRadius: "50%",
        background: accent ? theme.color : "rgba(2,10,20,0.88)",
        border: `1.5px solid ${theme.color}`,
        color: accent ? "#020a14" : theme.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        backdropFilter: "blur(8px)",
        pointerEvents: hidden ? "none" : "auto",
        boxShadow: accent ? `0 0 22px ${theme.glow}, 0 0 44px ${theme.glow}, inset 0 0 8px ${theme.glow}` : "none",
      }}
    >
      <Icon size={theme.planet * 0.46} strokeWidth={accent ? 2.4 : 1.8} />
      {planet.label && (
        <div
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-mono text-[8px] tracking-widest pointer-events-none"
          style={{
            color: accent ? "#020a14" : `${theme.color}cc`,
            transform: `translateX(-50%) rotate(${ringRotation}deg)`,
            whiteSpace: "nowrap",
            textShadow: accent ? "none" : "0 0 6px rgba(0,0,0,0.7)",
          }}
        >
          {planet.label.toUpperCase()}
        </div>
      )}
    </motion.button>
  );
}

/* =====================================================================
   Orbit — animated ring whose dashed line passes EXACTLY through every
   planet's geometric centre (planets sit on the orbit circumference).
   The visible dashed circle is therefore a fresh SVG drawn at the
   correct radius — independent from any container border which would
   force us into a `box-sizing` rabbit-hole.
   ===================================================================== */
function Orbit({ planets, theme, rotation, revealed, accentId, hoverId, dimNonAccent, onHover, onSelect }) {
  const containerSize = (theme.radius + theme.planet / 2 + 16) * 2;
  return (
    <motion.div
      initial={false}
      animate={{
        opacity: revealed ? 1 : 0,
        scale:   revealed ? 1 : 0.05,
      }}
      transition={{ type: "spring", stiffness: 180, damping: 22, mass: 0.7 }}
      style={{
        position: "absolute",
        width:  containerSize,
        height: containerSize,
        left: `calc(50% - ${containerSize / 2}px)`,
        top:  `calc(50% - ${containerSize / 2}px)`,
        pointerEvents: revealed ? "auto" : "none",
      }}
    >
      {/* Dashed orbit line — drawn as SVG so it passes EXACTLY through the
          centre of every planet (r = theme.radius). */}
      <svg
        width={containerSize}
        height={containerSize}
        viewBox={`0 0 ${containerSize} ${containerSize}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <circle
          cx={containerSize / 2}
          cy={containerSize / 2}
          r={theme.radius}
          fill="none"
          stroke={theme.color}
          strokeOpacity="0.28"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      </svg>

      {/* 12 o'clock tick — sits on the dashed line */}
      <div style={{
        position: "absolute", left: "50%",
        top: containerSize / 2 - theme.radius - 7,
        transform: "translateX(-50%)",
        width: 3, height: 14,
        background: theme.color, boxShadow: `0 0 8px ${theme.glow}`, borderRadius: 2,
      }} />
      {/* Orbit name above the tick */}
      <div style={{
        position: "absolute", left: "50%",
        top: containerSize / 2 - theme.radius - 22,
        transform: "translateX(-50%)",
        fontFamily: "var(--font-mono,monospace)", fontSize: 8,
        letterSpacing: "0.34em", color: theme.color, opacity: 0.55,
        pointerEvents: "none",
      }}>{theme.name}</div>

      <motion.div
        animate={{ rotate: rotation }}
        transition={{ type: "spring", stiffness: 160, damping: 26 }}
        style={{ position: "absolute", inset: 0 }}
      >
        {planets.map((p, i) => (
          <Planet
            key={p.id + "-" + i}
            planet={p} idx={i}
            ringRotation={rotation}
            theme={theme}
            accent={p.id === accentId || p.id === hoverId}
            dim={dimNonAccent && p.id !== accentId && p.id !== hoverId}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

/* =====================================================================
   Sun — glass-liquid central circle with thin outline.
   Content slot accepts any React node (text, crosshair, etc.)
   ===================================================================== */
function Sun({ skin, children, halo }) {
  if (skin === "minimal") {
    return (
      <div className="absolute inset-0 rounded-full border-[1.5px] border-cyan-300/80 bg-[#020a14]/85 backdrop-blur-2xl flex items-center justify-center pointer-events-none"
        style={{ boxShadow: `0 0 16px rgba(34,211,238,0.35), inset 0 0 12px rgba(34,211,238,0.18)` }}>
        {children}
      </div>
    );
  }
  if (skin === "crystal") {
    return (
      <div
        className="absolute inset-0 backdrop-blur-2xl flex items-center justify-center pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(30,27,75,0.65) 0%, rgba(2,10,20,0.85) 50%, rgba(131,24,67,0.55) 100%)",
          clipPath: "polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)",
          border: "1px solid rgba(192,132,252,0.85)",
          boxShadow: "0 0 26px rgba(192,132,252,0.45), inset 0 0 22px rgba(34,211,238,0.32)",
        }}
      >
        {children}
      </div>
    );
  }
  // GLASS (default) — lighter liquid glass with thin cyan outline
  return (
    <div
      className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none overflow-hidden"
      style={{
        border: "1.2px solid rgba(165,243,252,0.9)",
        background:
          "radial-gradient(circle at 30% 26%, rgba(207,250,254,0.55) 0%, rgba(103,232,249,0.32) 26%, rgba(34,211,238,0.20) 58%, rgba(8,38,57,0.55) 100%)",
        backdropFilter: "blur(8px) saturate(135%)",
        WebkitBackdropFilter: "blur(8px) saturate(135%)",
        boxShadow:
          "0 0 22px rgba(34,211,238,0.40), inset 0 0 22px rgba(207,250,254,0.22), inset 0 1px 0 rgba(255,255,255,0.55)",
      }}
    >
      {/* Specular highlight */}
      <div className="absolute -top-1 left-3 right-3 h-5 rounded-full opacity-75 pointer-events-none"
           style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.7), transparent)", filter: "blur(3px)" }} />
      {halo && (
        <motion.div
          className="absolute inset-2 rounded-full border border-cyan-200/40"
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.12, 0.6] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {children}
    </div>
  );
}

/* Crosshair overlay used for point-pick mode */
function CrosshairFx() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-full h-full"
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-px h-full bg-rose-400/85 shadow-[0_0_10px_#fb7185]" />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 h-px w-full bg-rose-400/85 shadow-[0_0_10px_#fb7185]" />
        <div className="absolute inset-[34%] rounded-full border-2 border-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.55)]" />
        <div className="absolute inset-[44%] rounded-full bg-rose-400 shadow-[0_0_10px_#fb7185]" />
      </motion.div>
    </div>
  );
}

/* =====================================================================
   Side info panel (right edge): list of completed actions w/ ✏ 💾 ✕
   ===================================================================== */
function SidePanel({ entries, onEdit, onSave, onDelete }) {
  if (!entries.length) return null;
  return (
    <div
      data-testid="radial-side-panel"
      className="fixed right-4 z-40 max-w-[300px] w-[300px] flex flex-col gap-2 pointer-events-none"
      style={{ top: 80, bottom: 80, overflowY: "auto" }}
    >
      <div className="font-mono text-[9px] tracking-[0.32em] text-cyan-300 px-1 pointer-events-none">CONTEXTO · {entries.length}</div>
      <AnimatePresence>
        {entries.map((e) => (
          <motion.div
            key={e.id}
            data-testid={`side-card-${e.id}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="panel-solid p-2.5 pointer-events-auto"
            style={{ borderLeft: `3px solid ${e.color || "#22d3ee"}` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] tracking-widest font-bold text-cyan-200 truncate">{e.title}</div>
                <div className="font-mono text-[9px] text-cyan-300/80 mt-0.5 leading-snug break-words">{e.value}</div>
                {e.meta && <div className="font-mono text-[8px] text-cyan-500/70 mt-0.5 italic">{e.meta}</div>}
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button type="button" data-testid={`side-edit-${e.id}`}
                        onClick={() => onEdit && onEdit(e)}
                        className="p-1 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/30 text-cyan-200 rounded"
                        title="Modificar">
                  <Pencil className="w-2.5 h-2.5" />
                </button>
                <button type="button" data-testid={`side-save-${e.id}`}
                        onClick={() => onSave && onSave(e)}
                        className="p-1 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 rounded"
                        title="Guardar">
                  <Save className="w-2.5 h-2.5" />
                </button>
                <button type="button" data-testid={`side-del-${e.id}`}
                        onClick={() => onDelete && onDelete(e)}
                        className="p-1 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/30 text-rose-300 rounded"
                        title="Eliminar">
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* =====================================================================
   RadialCommand main
   ===================================================================== */
export default function RadialCommand({
  origin, destination,
  onStartPicking, onResetPoints, onReversePoints,
  onCompute, onToggleLayer, onPickInfo, onSearchNearby,
  onLocateMe, onOpenExpert, onGeocoderOpen,
  transportMode, onTransportChange,
  resultText,
  sideEntries, onEntryEdit, onEntrySave, onEntryDelete,
}) {
  // ----- drag the whole control around -------------------------------------
  const [pos, setPos] = useState(() => ({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 700,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 400,
  }));
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ pointerX: 0, pointerY: 0, posX: 0, posY: 0 });
  const onDragMove = useCallback((e) => {
    setPos({
      x: dragRef.current.posX + (e.clientX - dragRef.current.pointerX),
      y: dragRef.current.posY + (e.clientY - dragRef.current.pointerY),
    });
  }, []);
  const onDragEnd = useCallback(() => {
    setDragging(false);
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
  }, [onDragMove]);
  const onDragStart = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragging(true);
    dragRef.current = { pointerX: e.clientX, pointerY: e.clientY, posX: pos.x, posY: pos.y };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd);
  };

  // ----- expand / minimize / skin ------------------------------------------
  const [minimized, setMinimized] = useState(false);
  const [skinIdx, setSkinIdx]     = useState(0);
  const [expanded, setExpanded]   = useState(false);
  const [hoverPlanet, setHoverPlanet] = useState(null);

  useEffect(() => {
    if (!expanded || dragging || minimized) return;
    const onMove = (e) => {
      const d = Math.hypot(e.clientX - pos.x, e.clientY - pos.y);
      if (d > 300) setExpanded(false);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [expanded, dragging, minimized, pos.x, pos.y]);

  // ----- mode + sub-action + steps state -----------------------------------
  const [mode, setMode]           = useState("main");           // which screen
  const [activeSubId, setActiveSubId] = useState(null);         // orbit2 planet currently active (e.g. "select_points")
  const [stepIdx, setStepIdx]     = useState(0);                // index in active sub-action's steps array
  const [stepStatus, setStepStatus] = useState({});             // { stepId: true } when completed
  const [bootDone, setBootDone]   = useState(false);            // user has consumed the "Centrar mi posición" prompt

  // Hovering the hover-zone in main mode → invite the user to click for locate.
  // Clicking the zone (not a planet) in main mode runs the default action.
  const handleHoverZoneClick = (e) => {
    e.stopPropagation();
    if (minimized) { setMinimized(false); return; }
    if (!bootDone && mode === "main" && !expanded) {
      // First click — fulfil the default question "Centrar mi posición"
      setBootDone(true);
      if (onLocateMe) onLocateMe();
      return;
    }
    setExpanded(v => !v);
  };

  const orbit1Planets = useMemo(() => planetsFor(mode, "orbit1"), [mode]);
  const orbit2Planets = useMemo(() => planetsFor(mode, "orbit2"), [mode]);
  const orbit2Active  = useMemo(() => activeSubId ? orbit2Planets.find(p => p.id === activeSubId) : null, [orbit2Planets, activeSubId]);
  const orbit3Planets = useMemo(() => orbit2Active?.steps || [], [orbit2Active]);

  // ----- rotations ----------------------------------------------------------
  // orbit1 → align macro mode at 12 o'clock when not in main
  const orbit1Rotation = useMemo(() => {
    const cfg = MODES[mode];
    if (!cfg?.activeOrbit1) return 0;
    const idx = indexOfPlanet(orbit1Planets, cfg.activeOrbit1);
    return idx >= 0 ? rotationForSlot(idx) : 0;
  }, [mode, orbit1Planets]);
  // orbit2 → align the active sub-action planet
  const orbit2Rotation = useMemo(() => {
    if (!activeSubId) return 0;
    const idx = indexOfPlanet(orbit2Planets, activeSubId);
    return idx >= 0 ? rotationForSlot(idx) : 0;
  }, [activeSubId, orbit2Planets]);
  // orbit3 → align the current step at 12 o'clock
  const orbit3Rotation = useMemo(() => rotationForSlot(stepIdx), [stepIdx]);

  // ----- reveal state -------------------------------------------------------
  const revealOrbit1 = expanded && !minimized;
  const revealOrbit2 = revealOrbit1 && mode !== "main";
  const revealOrbit3 = revealOrbit2 && orbit3Planets.length > 0;

  // ----- crosshair UI ON when orbit3 has steps & the workflow is "select_points"
  const inCrosshair = revealOrbit3 && activeSubId === "select_points" && stepIdx < orbit3Planets.length;

  // ----- when the parent fills origin/destination, advance the step -------
  useEffect(() => {
    if (!inCrosshair) return;
    const step = orbit3Planets[stepIdx];
    if (!step) return;
    const value = step.field === "origin" ? origin : destination;
    if (!value) return;
    setStepStatus(s => ({ ...s, [step.id]: true }));
    const nextIdx = stepIdx + 1;
    setStepIdx(nextIdx);
    // When all steps complete, collapse orbit 3 — keep activeSubId so the
    // orbit-2 selection (e.g. Puntos) stays highlighted in the next session.
    if (nextIdx >= orbit3Planets.length) {
      // small delay so the user sees the last step turn green before fade
      setTimeout(() => setStepIdx(0), 600);
    }
  // intentional: react to fresh origin/destination only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination]);

  // ----- planet click dispatcher -------------------------------------------
  const handleSelect = (planet) => {
    if (planet.type === "mode" && planet.targetMode) {
      setMode(planet.targetMode);
      setActiveSubId(null);
      setStepIdx(0);
      setStepStatus({});
      return;
    }
    if (planet.type === "toggle") {
      if (onToggleLayer) onToggleLayer(planet.value, true);
      return;
    }
    if (planet.type === "action") {
      runAction(planet);
      return;
    }
  };

  const runAction = (planet) => {
    setActiveSubId(planet.id);
    setStepIdx(0);
    setStepStatus({});
    switch (planet.action) {
      case "select_points":
        if (onStartPicking) onStartPicking();
        return;
      case "compute":
        if (onCompute) onCompute();
        return;
      case "reverse_points":
        if (onReversePoints) onReversePoints();
        return;
      case "reset":
        if (onResetPoints) onResetPoints();
        return;
      case "cycle_transport": {
        const modes = ["car", "transit", "bike", "foot", "scooter", "taxi"];
        const i = modes.indexOf(transportMode);
        const next = modes[(i + 1) % modes.length];
        if (onTransportChange) onTransportChange(next);
        return;
      }
      case "pick_info":   if (onPickInfo)     onPickInfo(); return;
      case "search_nearby": if (onSearchNearby) onSearchNearby(planet.value); return;
      case "locate_me":   if (onLocateMe)     onLocateMe(); return;
      case "cycle_skin":  setSkinIdx(i => (i + 1) % CORE_SKINS.length); return;
      case "minimize":    setMinimized(true); return;
      case "expert_mode": if (onOpenExpert)   onOpenExpert(); return;
      case "open_geocoder": if (onGeocoderOpen) onGeocoderOpen(); return;
      default:
    }
  };

  // ----- central sun content -----------------------------------------------
  const centerContent = useMemo(() => {
    if (inCrosshair) {
      const step = orbit3Planets[stepIdx];
      return { title: step?.label?.toUpperCase() || "PICK", subtitle: step?.prompt || "Click en mapa", color: "#fb7185" };
    }
    if (hoverPlanet) return { title: hoverPlanet.label, subtitle: hoverPlanet.desc, color: "#67e8f9" };
    if (resultText && mode === "navegador") return { title: "Listo", subtitle: resultText, color: "#4ade80" };
    const cfg = MODES[mode];
    return { title: cfg.centerLabel, subtitle: expanded ? cfg.centerHint : "", color: "#22d3ee" };
  }, [inCrosshair, orbit3Planets, stepIdx, hoverPlanet, resultText, mode, expanded]);

  /* ====================== RENDER ====================== */
  return (
    <>
      <div
        data-testid="radial-command"
        style={{
          position: "fixed",
          left: pos.x, top: pos.y,
          transform: "translate(-50%, -50%)",
          width: minimized ? 70 : CONTAINER,
          height: minimized ? 70 : CONTAINER,
          zIndex: 60,
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {/* Hover-trigger / drag handle = small disc around the sun */}
        <div
          data-testid="radial-hover-zone"
          onMouseEnter={() => setExpanded(true)}
          onClick={handleHoverZoneClick}
          onPointerDown={onDragStart}
          style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            width: minimized ? 60 : SUN_DIAMETER + 30,
            height: minimized ? 60 : SUN_DIAMETER + 30,
            borderRadius: "50%",
            cursor: dragging ? "grabbing" : "grab",
            zIndex: 35,
            pointerEvents: "auto",
          }}
        />

        {/* ====== ORBITS — render in z-order (3 → 2 → 1 so inner sits on top) ====== */}
        <Orbit
          planets={orbit3Planets}
          theme={RING_THEME.orbit3}
          rotation={orbit3Rotation}
          revealed={revealOrbit3 && !minimized}
          accentId={orbit3Planets[stepIdx]?.id}
          hoverId={hoverPlanet?.id}
          dimNonAccent={true}
          onHover={setHoverPlanet}
          onSelect={() => {}}
        />
        <Orbit
          planets={orbit2Planets}
          theme={RING_THEME.orbit2}
          rotation={orbit2Rotation}
          revealed={revealOrbit2 && !minimized}
          accentId={activeSubId}
          hoverId={hoverPlanet?.id}
          dimNonAccent={false}
          onHover={setHoverPlanet}
          onSelect={handleSelect}
        />
        <Orbit
          planets={orbit1Planets}
          theme={RING_THEME.orbit1}
          rotation={orbit1Rotation}
          revealed={revealOrbit1 && !minimized}
          accentId={MODES[mode]?.activeOrbit1}
          hoverId={hoverPlanet?.id}
          dimNonAccent={mode !== "main"}
          onHover={setHoverPlanet}
          onSelect={handleSelect}
        />

        {/* ====== SUN ====== */}
        <div
          data-testid="radial-core"
          style={{
            position: "absolute",
            left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            width:  minimized ? 50 : SUN_DIAMETER,
            height: minimized ? 50 : SUN_DIAMETER,
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          <Sun skin={CORE_SKINS[skinIdx]} halo={!minimized}>
            {!minimized && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-3 text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={centerContent.title + (inCrosshair ? "-x" : "") + skinIdx}
                    initial={{ opacity: 0, y: 4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.22 }}
                    className="font-mono uppercase font-bold leading-tight"
                    style={{
                      color: centerContent.color,
                      fontSize: (centerContent.title?.length || 0) > 9 ? "11px" : "14px",
                      letterSpacing: "0.18em",
                      textShadow: `0 0 10px ${centerContent.color}`,
                    }}
                  >
                    {centerContent.title}
                  </motion.div>
                </AnimatePresence>
                {centerContent.subtitle && (
                  <div className="font-mono text-[8px] text-cyan-200/70 mt-1 leading-tight max-w-[100px]">
                    {centerContent.subtitle}
                  </div>
                )}
              </div>
            )}
            {inCrosshair && <CrosshairFx />}
          </Sun>
        </div>

        {/* mini-toolbar above the sun */}
        {expanded && !minimized && !inCrosshair && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-1/2 -translate-x-1/2 flex gap-1.5"
            style={{ top: `calc(50% - ${SUN_DIAMETER/2 + 18}px)`, transform: "translateX(-50%)", zIndex: 40, pointerEvents: "auto" }}
          >
            <button type="button" data-testid="radial-skin-toggle"
                    onClick={(e) => { e.stopPropagation(); setSkinIdx(i => (i + 1) % CORE_SKINS.length); }}
                    className="p-1 bg-[#020a14]/90 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 rounded-full"
                    title="Cambiar aspecto"><Palette size={10} /></button>
            <button type="button" data-testid="radial-minimize"
                    onClick={(e) => { e.stopPropagation(); setMinimized(true); }}
                    className="p-1 bg-[#020a14]/90 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 rounded-full"
                    title="Minimizar"><Minimize2 size={10} /></button>
          </motion.div>
        )}

        {/* Cancel pick mid-workflow */}
        {inCrosshair && (
          <motion.button
            type="button" data-testid="radial-cancel-pick"
            onClick={(e) => { e.stopPropagation(); setActiveSubId(null); setStepIdx(0); setStepStatus({}); if (onResetPoints) onResetPoints(); }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 bg-rose-500/15 border border-rose-400/60 hover:bg-rose-500/30 font-mono text-[9px] tracking-widest text-rose-200 rounded-full"
            style={{ top: `calc(50% + ${SUN_DIAMETER/2 + 12}px)`, zIndex: 40, pointerEvents: "auto" }}
          ><XIcon className="inline w-2.5 h-2.5 mr-0.5" /> CANCELAR</motion.button>
        )}

        {minimized && (
          <button type="button" data-testid="radial-maximize"
                  onClick={(e) => { e.stopPropagation(); setMinimized(false); }}
                  className="absolute -right-1 -top-1 p-0.5 bg-cyan-400 text-[#020a14] rounded-full"
                  style={{ pointerEvents: "auto" }}>
            <Maximize2 size={9} />
          </button>
        )}
      </div>

      <SidePanel entries={sideEntries || []} onEdit={onEntryEdit} onSave={onEntrySave} onDelete={onEntryDelete} />
    </>
  );
}
