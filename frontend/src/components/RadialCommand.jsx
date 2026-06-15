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

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function clampControlPosition(x, y) {
  if (typeof window === "undefined") return { x, y };
  const margin = 54;
  return {
    x: clamp(x, margin, window.innerWidth - margin),
    y: clamp(y, margin, window.innerHeight - margin),
  };
}

/* =====================================================================
   Planet — a small button orbiting a ring at its angular slot.
   ===================================================================== */
function Planet({ planet, idx, total, ringRotation, theme, accent, dim, hidden, onHover, onSelect }) {
  const Icon = ICON_MAP[planet.icon] || Info;
  const planetColor = planet.done ? "#4ade80" : theme.color;
  const planetGlow = planet.done ? "rgba(74,222,128,0.55)" : theme.glow;
  const safeTotal = Math.max(total || 1, 1);
  const angleDeg = safeTotal === 1 ? -90 : (idx * (360 / safeTotal) - 90);
  const rad = (angleDeg * Math.PI) / 180;
  const x = Math.cos(rad) * theme.radius;
  const y = Math.sin(rad) * theme.radius;

  return (
    <div
      data-testid={`planet-wrapper-${planet.id}`}
      style={{
        position: "absolute",
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        width: theme.planet,
        height: theme.planet,
        transform: `translate(-50%, -50%) rotate(${-ringRotation}deg)`,
        transformOrigin: "50% 50%",
        pointerEvents: hidden ? "none" : "auto",
        zIndex: accent ? 8 : 4,
      }}
    >
      <motion.button
        type="button"
        data-testid={`planet-${planet.id}`}
        aria-label={planet.label || planet.id}
        title={planet.desc || planet.label || planet.id}
        onClick={(e) => { e.stopPropagation(); onSelect && onSelect(planet, idx); }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerEnter={(e) => { if (e.pointerType !== "touch") onHover && onHover(planet); }}
        onPointerLeave={(e) => { if (e.pointerType !== "touch") onHover && onHover(null); }}
        onFocus={() => onHover && onHover(planet)}
        onBlur={() => onHover && onHover(null)}
        animate={{
          opacity: hidden ? 0 : (dim ? 0.34 : 1),
          scale: accent ? 1.18 : 1,
        }}
        whileHover={{ scale: (accent ? 1.18 : 1) * 1.08 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        style={{
          width: theme.planet,
          height: theme.planet,
          borderRadius: "50%",
          background: accent ? planetColor : "rgba(2,10,20,0.9)",
          border: `1.5px solid ${planetColor}`,
          color: accent ? "#020a14" : planetColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: accent
            ? `0 0 22px ${planetGlow}, 0 0 44px ${planetGlow}, inset 0 0 8px ${planetGlow}`
            : `0 0 9px rgba(0,0,0,0.32), inset 0 0 8px rgba(255,255,255,0.04)`,
        }}
      >
        <Icon size={theme.planet * 0.46} strokeWidth={accent ? 2.4 : 1.8} />
      </motion.button>
      {planet.label && (
        <div
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-mono text-[8px] tracking-widest"
          style={{
            color: planet.done ? "#86efac" : (accent ? planetColor : `${planetColor}cc`),
            whiteSpace: "nowrap",
            textShadow: "0 0 7px rgba(0,0,0,0.9)",
            maxWidth: 78,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {planet.label.toUpperCase()}
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   Orbit — mathematically exact dynamic distribution.
   Every planet centre lies on the SVG circle itself: radius = theme.radius.
   The angular step is 360 / numberOfPlanets, so 2 buttons are diametral,
   3 form a perfect triangle, 4 a cross, 5/6 stay equally distributed.
   ===================================================================== */
function Orbit({ planets, theme, rotation, revealed, accentId, hoverId, dimNonAccent, onHover, onSelect }) {
  const labelPad = 38;
  const containerSize = Math.ceil((theme.radius + theme.planet / 2 + labelPad) * 2);
  const total = Math.max(planets.length, 1);
  return (
    <motion.div
      initial={false}
      animate={{
        opacity: revealed ? 1 : 0,
        scale:   revealed ? 1 : 0.08,
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
          strokeOpacity="0.32"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        {/* thin mathematical guide: exact axis cross through the orbit centre */}
        <line x1={containerSize/2 - 4} y1={containerSize/2} x2={containerSize/2 + 4} y2={containerSize/2} stroke={theme.color} strokeOpacity="0.28" />
        <line x1={containerSize/2} y1={containerSize/2 - 4} x2={containerSize/2} y2={containerSize/2 + 4} stroke={theme.color} strokeOpacity="0.28" />
      </svg>

      <div style={{
        position: "absolute", left: "50%",
        top: containerSize / 2 - theme.radius - 7,
        transform: "translateX(-50%)",
        width: 3, height: 14,
        background: theme.color, boxShadow: `0 0 8px ${theme.glow}`, borderRadius: 2,
      }} />
      <div style={{
        position: "absolute", left: "50%",
        top: containerSize / 2 - theme.radius - 24,
        transform: "translateX(-50%)",
        fontFamily: "var(--font-mono,monospace)", fontSize: 8,
        letterSpacing: "0.34em", color: theme.color, opacity: 0.58,
        pointerEvents: "none",
      }}>{theme.name}</div>

      <motion.div
        animate={{ rotate: rotation }}
        transition={{ type: "spring", stiffness: 160, damping: 26 }}
        style={{ position: "absolute", inset: 0, transformOrigin: "50% 50%" }}
      >
        {planets.map((p, i) => (
          <Planet
            key={p.id + "-" + i}
            planet={p} idx={i} total={total}
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
      <div className="absolute inset-0 rounded-full border-[1.5px] border-cyan-300/80 bg-[#020a14]/85 backdrop-blur-2xl flex items-center justify-center"
        style={{ boxShadow: `0 0 16px rgba(34,211,238,0.35), inset 0 0 12px rgba(34,211,238,0.18)` }}>
        {children}
      </div>
    );
  }
  if (skin === "crystal") {
    return (
      <div
        className="absolute inset-0 backdrop-blur-2xl flex items-center justify-center"
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
  // GLASS (default) — Apple-like crystal liquid glass.
  // Luminous, transparent and layered over the map.
  return (
    <div
      className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden"
      style={{
        border: "1px solid rgba(255,255,255,0.62)",
        background:
          "radial-gradient(circle at 26% 18%, rgba(255,255,255,0.92) 0%, rgba(225,252,255,0.66) 15%, rgba(125,236,255,0.34) 33%, rgba(22,130,166,0.22) 58%, rgba(2,18,30,0.52) 100%)",
        backdropFilter: "blur(22px) saturate(185%) contrast(108%)",
        WebkitBackdropFilter: "blur(22px) saturate(185%) contrast(108%)",
        boxShadow:
          "0 22px 80px rgba(15,23,42,0.32), 0 0 42px rgba(34,211,238,0.38), inset 0 1px 1px rgba(255,255,255,0.92), inset 0 -18px 34px rgba(8,145,178,0.20), inset 0 0 34px rgba(255,255,255,0.20)",
      }}
    >
      <div className="absolute left-[16%] right-[16%] top-[8%] h-[24%] rounded-full opacity-90"
           style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.16) 58%, transparent)", filter: "blur(4px)" }} />
      <div className="absolute -left-[10%] top-[28%] h-[42%] w-[30%] rounded-full opacity-45"
           style={{ background: "radial-gradient(circle, rgba(255,255,255,0.72), transparent 68%)", filter: "blur(10px)" }} />
      <div className="absolute inset-x-[18%] bottom-[9%] h-[14%] rounded-full opacity-55"
           style={{ background: "radial-gradient(ellipse, rgba(34,211,238,0.36), transparent 70%)", filter: "blur(6px)" }} />
      {halo && (
        <motion.div
          className="absolute inset-2 rounded-full border border-white/45"
          animate={{ scale: [1, 1.06, 1], opacity: [0.52, 0.18, 0.52] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {children}
    </div>
  );
}
/* Crosshair overlay used for point-pick mode */
function CrosshairFx() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
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
function SidePanel({
  entries, actions, steps, stepIdx, stepStatus, systemActions, modeLabel, hoverPlanet, activeSubId,
  onActionHover, onActionSelect, onStepSelect, onSystemAction,
  onEdit, onSave, onDelete,
}) {
  const visibleActions = actions || [];
  const visibleSteps = steps || [];
  return (
    <div
      data-testid="radial-side-panel"
      className="fixed right-4 z-40 max-w-[320px] w-[320px] flex flex-col gap-2 pointer-events-auto"
      style={{ top: 80, bottom: 80, overflowY: "auto" }}
    >
      <div className="panel-solid p-3" style={{ borderLeft: "3px solid #22d3ee" }}>
        <div className="font-mono text-[9px] tracking-[0.32em] text-cyan-300/90">MENÚ DE INTERACCIÓN</div>
        <div className="mt-1 font-mono text-[11px] tracking-widest text-cyan-100 uppercase">{modeLabel}</div>
        {hoverPlanet?.desc && (
          <div className="mt-1 font-mono text-[9px] text-cyan-300/75 leading-snug">{hoverPlanet.desc}</div>
        )}
      </div>

      {!!visibleActions.length && (
        <div className="panel-solid p-2.5">
          <div className="font-mono text-[8px] tracking-[0.28em] text-amber-300/80 mb-2">ACCIONES DISPONIBLES</div>
          <div className="grid grid-cols-1 gap-1.5">
            {visibleActions.map((a) => {
              const Icon = ICON_MAP[a.icon] || Info;
              const active = a.id === activeSubId || a.id === hoverPlanet?.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  data-testid={`right-action-${a.id}`}
                  onPointerEnter={() => onActionHover && onActionHover(a)}
                  onPointerLeave={() => onActionHover && onActionHover(null)}
                  onClick={(e) => { e.stopPropagation(); onActionSelect && onActionSelect(a); }}
                  className="group w-full flex items-center gap-2 rounded-xl px-2 py-2 border text-left transition-all"
                  style={{
                    borderColor: active ? "rgba(251,191,36,0.85)" : "rgba(34,211,238,0.20)",
                    background: active ? "rgba(251,191,36,0.13)" : "rgba(2,10,20,0.72)",
                    boxShadow: active ? "0 0 16px rgba(251,191,36,0.18)" : "none",
                  }}
                >
                  <span
                    className="flex items-center justify-center rounded-full shrink-0"
                    style={{
                      width: 28, height: 28,
                      border: `1px solid ${active ? "#fbbf24" : "rgba(34,211,238,0.45)"}`,
                      color: active ? "#fbbf24" : "#67e8f9",
                      background: "rgba(0,0,0,0.28)",
                    }}
                  >
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[10px] tracking-widest text-cyan-100 uppercase truncate">{a.label}</span>
                    <span className="block font-mono text-[8px] text-cyan-300/65 leading-snug truncate">{a.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!!visibleSteps.length && (
        <div className="panel-solid p-2.5">
          <div className="font-mono text-[8px] tracking-[0.28em] text-purple-300/80 mb-2">PASOS DEL FLUJO</div>
          <div className="grid grid-cols-1 gap-1.5">
            {visibleSteps.map((step, i) => {
              const Icon = ICON_MAP[step.icon] || MapPin;
              const active = i === stepIdx;
              const done = !!stepStatus?.[step.id];
              return (
                <button
                  key={step.id}
                  type="button"
                  data-testid={`right-step-${step.id}`}
                  onPointerEnter={() => onActionHover && onActionHover(step)}
                  onPointerLeave={() => onActionHover && onActionHover(null)}
                  onClick={(e) => { e.stopPropagation(); onStepSelect && onStepSelect(step, i); }}
                  className="group w-full flex items-center gap-2 rounded-xl px-2 py-2 border text-left transition-all"
                  style={{
                    borderColor: done ? "rgba(74,222,128,0.80)" : active ? "rgba(192,132,252,0.85)" : "rgba(192,132,252,0.22)",
                    background: done ? "rgba(74,222,128,0.12)" : active ? "rgba(192,132,252,0.13)" : "rgba(2,10,20,0.72)",
                    boxShadow: active ? "0 0 16px rgba(192,132,252,0.16)" : "none",
                  }}
                >
                  <span
                    className="flex items-center justify-center rounded-full shrink-0"
                    style={{
                      width: 28, height: 28,
                      border: `1px solid ${done ? "#4ade80" : active ? "#c084fc" : "rgba(192,132,252,0.45)"}`,
                      color: done ? "#4ade80" : active ? "#c084fc" : "#d8b4fe",
                      background: "rgba(0,0,0,0.28)",
                    }}
                  >
                    {done ? <Check size={14} /> : <Icon size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[10px] tracking-widest text-cyan-100 uppercase truncate">{step.label}</span>
                    <span className="block font-mono text-[8px] text-cyan-300/65 leading-snug truncate">{done ? "Punto capturado" : step.prompt}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!!systemActions?.length && (
        <div className="panel-solid p-2.5">
          <div className="font-mono text-[8px] tracking-[0.28em] text-cyan-300/80 mb-2">OPERACIÓN RÁPIDA</div>
          <div className="grid grid-cols-2 gap-1.5">
            {systemActions.map((a) => {
              const Icon = ICON_MAP[a.icon] || Info;
              return (
                <button
                  key={a.id}
                  type="button"
                  data-testid={`right-system-${a.id}`}
                  onClick={(e) => { e.stopPropagation(); onSystemAction && onSystemAction(a); }}
                  className="flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/20 hover:border-cyan-300/60 font-mono text-[8px] tracking-widest text-cyan-100 uppercase"
                >
                  <Icon size={11} /> {a.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!!entries.length && (
        <div className="font-mono text-[9px] tracking-[0.32em] text-cyan-300 px-1">HISTORIAL · {entries.length}</div>
      )}
      <AnimatePresence>
        {(entries || []).map((e) => (
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
  onBootstrapComplete, onSetPointFromText, onRouteOption,
  transportMode, onTransportChange,
  resultText,
  sideEntries, onEntryEdit, onEntrySave, onEntryDelete,
}) {
  // ---------------------------------------------------------------------
  //  Boot flow: AUTH DEMO → PROFILE/LOCATION → READY.
  //  Until READY, only the large central orb is visible.
  // ---------------------------------------------------------------------
  const [bootStage, setBootStage] = useState("auth");
  const [visitorName, setVisitorName] = useState("Visitor");
  const [manualLocation, setManualLocation] = useState("Barcelona");
  const isReady = bootStage === "ready";

  const bootSize = 286;
  const controlSize = bootStage !== "ready" ? 350 : CONTAINER;
  const activeSunSize = bootStage !== "ready" ? bootSize : SUN_DIAMETER;

  // ----- drag the whole control around -------------------------------------
  const [pos, setPos] = useState(() => clampControlPosition(
    typeof window !== "undefined" ? window.innerWidth / 2 : 700,
    typeof window !== "undefined" ? window.innerHeight / 2 : 400,
  ));
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ pointerX: 0, pointerY: 0, posX: 0, posY: 0, moved: false });
  const suppressClickRef = useRef(false);
  const hoverClearTimer = useRef(null);

  const onDragMove = useCallback((e) => {
    const dx = e.clientX - dragRef.current.pointerX;
    const dy = e.clientY - dragRef.current.pointerY;
    if (Math.hypot(dx, dy) > 4) dragRef.current.moved = true;
    setPos(clampControlPosition(
      dragRef.current.posX + dx,
      dragRef.current.posY + dy,
    ));
  }, []);
  const onDragEnd = useCallback(() => {
    if (dragRef.current.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
    setDragging(false);
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
  }, [onDragMove]);
  const onDragStart = (e) => {
    if (e.button !== 0) return;
    // Onboarding orb should feel like a dialog, not a movable widget.
    if (!isReady) return;
    e.preventDefault();
    setDragging(true);
    dragRef.current = { pointerX: e.clientX, pointerY: e.clientY, posX: pos.x, posY: pos.y, moved: false };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd);
  };

  // ----- expand / minimize / skin ------------------------------------------
  const [minimized, setMinimized] = useState(false);
  const [skinIdx, setSkinIdx]     = useState(0);
  const [expanded, setExpanded]   = useState(false);
  const [hoverPlanet, setHoverPlanet] = useState(null);

  const setPreviewPlanet = useCallback((planet) => {
    if (hoverClearTimer.current) window.clearTimeout(hoverClearTimer.current);
    if (planet) {
      setHoverPlanet(planet);
      return;
    }
    hoverClearTimer.current = window.setTimeout(() => setHoverPlanet(null), 90);
  }, []);

  useEffect(() => () => {
    if (hoverClearTimer.current) window.clearTimeout(hoverClearTimer.current);
  }, []);

  useEffect(() => {
    if (!expanded || dragging || minimized || !isReady) return;
    const onMove = (e) => {
      const d = Math.hypot(e.clientX - pos.x, e.clientY - pos.y);
      if (d > 380 && !hoverPlanet) setExpanded(false);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [expanded, dragging, minimized, hoverPlanet, pos.x, pos.y, isReady]);

  // ----- mode + sub-action + route workflow state --------------------------
  const [mode, setMode] = useState("main");
  const [activeSubId, setActiveSubId] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepStatus, setStepStatus] = useState({});
  const [pointInput, setPointInput] = useState("");
  const [pointPickingField, setPointPickingField] = useState(null); // origin | destination | null

  const completeBoot = useCallback((payload) => {
    setBootStage("ready");
    setExpanded(false);
    setMode("main");
    setActiveSubId(null);
    setPointPickingField(null);
    const centered = clampControlPosition(
      typeof window !== "undefined" ? window.innerWidth / 2 : pos.x,
      typeof window !== "undefined" ? window.innerHeight / 2 : pos.y,
    );
    setPos(centered);
    if (onBootstrapComplete) onBootstrapComplete(payload);
  }, [onBootstrapComplete, pos.x, pos.y]);

  const submitManualLocation = useCallback(() => {
    completeBoot({
      name: visitorName?.trim() || "Visitor",
      locationQuery: manualLocation?.trim() || "Barcelona",
      useGeolocation: false,
    });
  }, [completeBoot, visitorName, manualLocation]);

  const submitBrowserLocation = useCallback(() => {
    completeBoot({
      name: visitorName?.trim() || "Visitor",
      locationQuery: manualLocation?.trim() || "Barcelona",
      useGeolocation: true,
    });
  }, [completeBoot, visitorName, manualLocation]);

  const handleHoverZoneClick = (e) => {
    e.stopPropagation();
    if (!isReady) return;
    if (suppressClickRef.current) return;
    if (minimized) { setMinimized(false); setExpanded(true); return; }
    setExpanded(v => !v);
  };

  const orbit1Planets = useMemo(() => planetsFor(mode, "orbit1"), [mode]);
  const orbit2Planets = useMemo(() => planetsFor(mode, "orbit2"), [mode]);
  const orbit2Active  = useMemo(() => activeSubId ? orbit2Planets.find(p => p.id === activeSubId) : null, [orbit2Planets, activeSubId]);
  const orbit3Planets = useMemo(() => orbit2Active?.steps || [], [orbit2Active]);
  const orbit3RenderedPlanets = useMemo(
    () => orbit3Planets.map((p) => ({ ...p, done: !!stepStatus[p.id] })),
    [orbit3Planets, stepStatus]
  );

  const orbit1Rotation = useMemo(() => {
    const cfg = MODES[mode];
    if (!cfg?.activeOrbit1) return 0;
    const idx = indexOfPlanet(orbit1Planets, cfg.activeOrbit1);
    return idx >= 0 ? rotationForSlot(idx, orbit1Planets.length) : 0;
  }, [mode, orbit1Planets]);
  const orbit2Rotation = useMemo(() => {
    if (!activeSubId) return 0;
    const idx = indexOfPlanet(orbit2Planets, activeSubId);
    return idx >= 0 ? rotationForSlot(idx, orbit2Planets.length) : 0;
  }, [activeSubId, orbit2Planets]);
  const orbit3Rotation = useMemo(() => rotationForSlot(stepIdx, orbit3Planets.length), [stepIdx, orbit3Planets.length]);

  const revealOrbit1 = isReady && expanded && !minimized;
  const revealOrbit2 = revealOrbit1 && mode !== "main";
  const revealOrbit3 = revealOrbit2 && orbit3Planets.length > 0;
  const inCrosshair = !!pointPickingField;

  const activePointField = activeSubId === "set_origin" ? "origin" : activeSubId === "set_destination" ? "destination" : null;
  const activePointLabel = activePointField === "origin" ? "Inicio" : activePointField === "destination" ? "Destino" : "Punto";

  const startMapPick = useCallback((field) => {
    const safeField = field || activePointField || "origin";
    setPointPickingField(safeField);
    setExpanded(true);
    setStepStatus((s) => ({ ...s, [`${safeField}-text`]: false }));
    if (onStartPicking) onStartPicking(safeField);
    if (onRouteOption) onRouteOption({
      id: `pick-${safeField}`,
      icon: safeField === "origin" ? "MapPin" : "Flag",
      label: safeField === "origin" ? "Inicio en mapa" : "Destino en mapa",
      desc: "Esperando click sobre el mapa",
      action: "pick_point",
      field: safeField,
    });
  }, [activePointField, onStartPicking, onRouteOption]);

  const submitPointText = useCallback(() => {
    const field = activePointField || "origin";
    const query = pointInput.trim();
    if (!query) return;
    setStepStatus((s) => ({ ...s, [`${field}-text`]: true }));
    if (onSetPointFromText) onSetPointFromText(field, query);
    if (onRouteOption) onRouteOption({
      id: `text-${field}`,
      icon: field === "origin" ? "MapPin" : "Flag",
      label: field === "origin" ? "Inicio escrito" : "Destino escrito",
      desc: query,
      action: "input_point",
      field,
    });
  }, [activePointField, pointInput, onSetPointFromText, onRouteOption]);

  // Parent map filled the requested point → mark map-pick as complete.
  useEffect(() => {
    if (!pointPickingField) return;
    const value = pointPickingField === "origin" ? origin : destination;
    if (!value) return;
    setStepStatus((s) => ({ ...s, [`${pointPickingField}-map`]: true }));
    setPointPickingField(null);
  }, [origin, destination, pointPickingField]);

  const emitActionToRight = useCallback((planet, extra = {}) => {
    if (onRouteOption) onRouteOption({ ...planet, ...extra });
  }, [onRouteOption]);

  const handleSelect = (planet, idx) => {
    if (!planet) return;
    if (planet.action === "pick_point") {
      setStepIdx(typeof idx === "number" ? idx : 0);
      startMapPick(planet.field);
      return;
    }
    if (planet.action === "input_point") {
      setStepIdx(typeof idx === "number" ? idx : 0);
      const field = planet.field || activePointField || "origin";
      setActiveSubId(field === "origin" ? "set_origin" : "set_destination");
      setPointInput("");
      setExpanded(true);
      return;
    }
    if (planet.type === "mode" && planet.targetMode) {
      setMode(planet.targetMode);
      setActiveSubId(null);
      setStepIdx(0);
      setStepStatus({});
      setPointPickingField(null);
      setExpanded(true);
      return;
    }
    if (planet.type === "toggle") {
      if (onToggleLayer) onToggleLayer(planet.value, true);
      emitActionToRight(planet);
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
    setPointPickingField(null);
    setExpanded(true);

    switch (planet.action) {
      case "set_origin":
      case "set_destination":
        setPointInput("");
        emitActionToRight(planet, { desc: "Selecciona en mapa o escribe la dirección dentro del orbe" });
        return;
      case "compute":
        emitActionToRight(planet);
        if (onCompute) onCompute();
        return;
      case "reverse_points":
        emitActionToRight(planet);
        if (onReversePoints) onReversePoints();
        return;
      case "reset":
        emitActionToRight(planet);
        if (onResetPoints) onResetPoints();
        return;
      case "cycle_transport": {
        const modes = ["car", "transit", "bike", "foot", "scooter", "taxi"];
        const i = modes.indexOf(transportMode);
        const next = modes[(i + 1) % modes.length];
        if (onTransportChange) onTransportChange(next);
        emitActionToRight(planet, { value: next, desc: `Modo activo: ${next}` });
        return;
      }
      case "destination_parking":
      case "fuel_route":
      case "poi_route":
      case "avoid_tolls":
        emitActionToRight(planet);
        return;
      case "pick_info":   if (onPickInfo) onPickInfo(); emitActionToRight(planet); return;
      case "search_nearby": if (onSearchNearby) onSearchNearby(planet.value); emitActionToRight(planet); return;
      case "locate_me":   if (onLocateMe) onLocateMe(); emitActionToRight(planet); return;
      case "cycle_skin":  setSkinIdx(i => (i + 1) % CORE_SKINS.length); return;
      case "minimize":    setMinimized(true); return;
      case "expert_mode": if (onOpenExpert) onOpenExpert(); return;
      case "open_geocoder": if (onGeocoderOpen) onGeocoderOpen(); return;
      default:
        emitActionToRight(planet);
    }
  };

  const centerContent = useMemo(() => {
    if (inCrosshair) {
      const fieldLabel = pointPickingField === "origin" ? "INICIO" : "DESTINO";
      return { title: `${fieldLabel} MAPA`, subtitle: "Click en el mapa para fijar el punto", color: "#fb7185" };
    }
    if (hoverPlanet) return { title: hoverPlanet.label, subtitle: hoverPlanet.desc, color: "#67e8f9" };
    if (resultText && mode === "navegador") return { title: "Ruta", subtitle: resultText, color: "#4ade80" };
    const cfg = MODES[mode];
    return { title: cfg.centerLabel, subtitle: expanded ? cfg.centerHint : "Pasa el ratón para abrir funciones", color: "#22d3ee" };
  }, [inCrosshair, pointPickingField, hoverPlanet, resultText, mode, expanded]);

  const rightMenuActions = useMemo(() => (
    mode === "main" ? orbit1Planets : orbit2Planets
  ), [mode, orbit1Planets, orbit2Planets]);

  const systemActions = useMemo(() => ([
    { id: "locate",   icon: "Crosshair", label: "Centrar",  action: "locate_me" },
    { id: "search",   icon: "Search",    label: "Buscar",   action: "open_geocoder" },
    { id: "reset",    icon: "RotateCcw", label: "Limpiar",  action: "reset" },
    { id: "skin",     icon: "Palette",   label: "Aspecto",  action: "cycle_skin" },
    { id: "expert",   icon: "Wrench",    label: "Experto",  action: "expert_mode" },
    { id: "minimize", icon: "Minimize2", label: "Minim.",   action: "minimize" },
  ]), []);

  const handleSystemAction = useCallback((item) => {
    switch (item.action) {
      case "locate_me": if (onLocateMe) onLocateMe(); return;
      case "open_geocoder": if (onGeocoderOpen) onGeocoderOpen(); return;
      case "reset": if (onResetPoints) onResetPoints(); setActiveSubId(null); setStepIdx(0); setStepStatus({}); setPointPickingField(null); return;
      case "cycle_skin": setSkinIdx(i => (i + 1) % CORE_SKINS.length); return;
      case "expert_mode": if (onOpenExpert) onOpenExpert(); return;
      case "minimize": setMinimized(true); return;
      default: return;
    }
  }, [onLocateMe, onGeocoderOpen, onResetPoints, onOpenExpert]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA") return;
      if (e.key !== "Escape") return;
      if (!isReady) { setBootStage("auth"); return; }
      if (pointPickingField) { setPointPickingField(null); return; }
      if (activeSubId) { setActiveSubId(null); setStepIdx(0); setStepStatus({}); return; }
      if (mode !== "main") { setMode("main"); setExpanded(true); return; }
      setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSubId, mode, pointPickingField, isReady]);

  const renderBootContent = () => {
    if (bootStage === "auth") {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center" style={{ pointerEvents: "auto" }}>
          <div className="font-mono text-[9px] tracking-[0.36em] text-cyan-200/70 uppercase mb-2">Momentum demo access</div>
          <div className="font-mono text-[22px] tracking-[0.16em] text-cyan-100 uppercase font-bold mb-4">ORBEOS</div>
          <div className="grid grid-cols-2 gap-2 w-full max-w-[210px]">
            <button type="button" onClick={(e) => { e.stopPropagation(); setVisitorName("Demo user"); setBootStage("profile"); }} className="rounded-full border border-cyan-300/45 bg-cyan-400/10 px-3 py-2 font-mono text-[10px] tracking-widest text-slate-950 hover:bg-cyan-200/55">Log in</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setVisitorName("Demo user"); setBootStage("profile"); }} className="rounded-full border border-cyan-300/45 bg-cyan-400/10 px-3 py-2 font-mono text-[10px] tracking-widest text-slate-950 hover:bg-cyan-200/55">Sign up</button>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); setVisitorName("Visitor"); setBootStage("profile"); }} className="mt-3 w-full max-w-[210px] rounded-full border border-emerald-300/55 bg-emerald-400/15 px-3 py-2.5 font-mono text-[11px] tracking-[0.18em] text-slate-950 hover:bg-emerald-200/55">VISITOR · DEMO</button>
          <div className="mt-4 max-w-[210px] font-mono text-[8px] leading-snug text-cyan-200/55">Acceso provisional para probar navegación, capas y acciones contextuales.</div>
        </div>
      );
    }
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center" style={{ pointerEvents: "auto" }}>
        <div className="font-mono text-[9px] tracking-[0.32em] text-cyan-200/70 uppercase mb-2">Configurar sesión</div>
        <input
          value={visitorName}
          onChange={(e) => setVisitorName(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Nombre"
          className="w-full max-w-[220px] mb-2 rounded-full border border-cyan-300/35 bg-[#020a14]/75 px-3 py-2 text-center font-mono text-[11px] text-cyan-50 outline-none focus:border-cyan-200"
        />
        <input
          value={manualLocation}
          onChange={(e) => setManualLocation(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submitManualLocation(); }}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Escribe tu localización"
          className="w-full max-w-[220px] mb-3 rounded-full border border-cyan-300/35 bg-[#020a14]/75 px-3 py-2 text-center font-mono text-[11px] text-cyan-50 outline-none focus:border-cyan-200"
        />
        <button type="button" onClick={(e) => { e.stopPropagation(); submitBrowserLocation(); }} className="w-full max-w-[220px] rounded-full border border-emerald-300/55 bg-emerald-400/15 px-3 py-2 font-mono text-[10px] tracking-widest text-emerald-100 hover:bg-emerald-300/25">Aceptar localización</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); submitManualLocation(); }} className="mt-2 w-full max-w-[220px] rounded-full border border-cyan-300/45 bg-cyan-400/10 px-3 py-2 font-mono text-[10px] tracking-widest text-cyan-100 hover:bg-cyan-300/20">Usar ubicación escrita</button>
      </div>
    );
  };

  const renderPointInput = () => {
    if (!activePointField || inCrosshair) return null;
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center" style={{ pointerEvents: "auto" }}>
        <div className="font-mono text-[9px] tracking-[0.22em] text-cyan-100 uppercase mb-1">{activePointLabel}</div>
        <input
          value={pointInput}
          onChange={(e) => setPointInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submitPointText(); }}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Escribe o pega dirección"
          className="w-[96px] rounded-full border border-cyan-300/35 bg-[#020a14]/78 px-2 py-1.5 text-center font-mono text-[8px] text-cyan-50 outline-none focus:border-cyan-200"
        />
        <div className="mt-1.5 flex gap-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); startMapPick(activePointField); }} className="rounded-full border border-rose-300/55 bg-rose-400/15 px-1.5 py-1 font-mono text-[7px] tracking-widest text-rose-100 hover:bg-rose-300/25">MAPA</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); submitPointText(); }} className="rounded-full border border-emerald-300/55 bg-emerald-400/15 px-1.5 py-1 font-mono text-[7px] tracking-widest text-emerald-100 hover:bg-emerald-300/25">USAR</button>
        </div>
      </div>
    );
  };

  /* ====================== RENDER ====================== */
  return (
    <>
      <div
        data-testid="radial-command"
        style={{
          position: "fixed",
          left: pos.x, top: pos.y,
          transform: "translate(-50%, -50%)",
          width: minimized ? 70 : controlSize,
          height: minimized ? 70 : controlSize,
          zIndex: 60,
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        <div
          data-testid="radial-hover-zone"
          onPointerEnter={(e) => { if (isReady && e.pointerType === "mouse" && !minimized) setExpanded(true); }}
          onClick={handleHoverZoneClick}
          onPointerDown={onDragStart}
          style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            width: minimized ? 60 : activeSunSize + 32,
            height: minimized ? 60 : activeSunSize + 32,
            borderRadius: "50%",
            cursor: isReady ? (dragging ? "grabbing" : "grab") : "default",
            zIndex: isReady ? 35 : 12,
            pointerEvents: isReady ? "auto" : "none",
          }}
        />

        {isReady && (
          <>
            <Orbit
              planets={orbit3RenderedPlanets}
              theme={RING_THEME.orbit3}
              rotation={orbit3Rotation}
              revealed={revealOrbit3 && !minimized}
              accentId={orbit3Planets[stepIdx]?.id}
              hoverId={hoverPlanet?.id}
              dimNonAccent={true}
              onHover={setPreviewPlanet}
              onSelect={handleSelect}
            />
            <Orbit
              planets={orbit2Planets}
              theme={RING_THEME.orbit2}
              rotation={orbit2Rotation}
              revealed={revealOrbit2 && !minimized}
              accentId={activeSubId}
              hoverId={hoverPlanet?.id}
              dimNonAccent={false}
              onHover={setPreviewPlanet}
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
              onHover={setPreviewPlanet}
              onSelect={handleSelect}
            />
          </>
        )}

        <div
          data-testid="radial-core"
          style={{
            position: "absolute",
            left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            width: minimized ? 50 : activeSunSize,
            height: minimized ? 50 : activeSunSize,
            zIndex: 30,
            pointerEvents: isReady && !activePointField ? "none" : "auto",
          }}
        >
          <Sun skin={CORE_SKINS[skinIdx]} halo={!minimized}>
            {!isReady && renderBootContent()}
            {isReady && !minimized && activePointField && renderPointInput()}
            {isReady && !minimized && !activePointField && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
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
            {isReady && inCrosshair && <CrosshairFx />}
          </Sun>
        </div>

        {isReady && expanded && !minimized && !inCrosshair && (
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

        {isReady && inCrosshair && (
          <motion.button
            type="button" data-testid="radial-cancel-pick"
            onClick={(e) => { e.stopPropagation(); setPointPickingField(null); if (onResetPoints) onResetPoints(); }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute left-1/2 -translate-x-1/2 px-2 py-0.5 bg-rose-500/15 border border-rose-400/60 hover:bg-rose-500/30 font-mono text-[9px] tracking-widest text-rose-200 rounded-full"
            style={{ top: `calc(50% + ${SUN_DIAMETER/2 + 12}px)`, zIndex: 40, pointerEvents: "auto" }}
          ><XIcon className="inline w-2.5 h-2.5 mr-0.5" /> CANCELAR</motion.button>
        )}

        {isReady && minimized && (
          <button type="button" data-testid="radial-maximize"
                  onClick={(e) => { e.stopPropagation(); setMinimized(false); }}
                  className="absolute -right-1 -top-1 p-0.5 bg-cyan-400 text-[#020a14] rounded-full"
                  style={{ pointerEvents: "auto" }}>
            <Maximize2 size={9} />
          </button>
        )}
      </div>

      {isReady && (
        <SidePanel
          entries={sideEntries || []}
          actions={rightMenuActions}
          steps={revealOrbit3 ? orbit3RenderedPlanets : []}
          stepIdx={stepIdx}
          stepStatus={stepStatus}
          systemActions={systemActions}
          modeLabel={MODES[mode]?.centerLabel || mode}
          hoverPlanet={hoverPlanet}
          activeSubId={activeSubId || MODES[mode]?.activeOrbit1}
          onActionHover={setPreviewPlanet}
          onActionSelect={handleSelect}
          onStepSelect={handleSelect}
          onSystemAction={handleSystemAction}
          onEdit={onEntryEdit}
          onSave={onEntrySave}
          onDelete={onEntryDelete}
        />
      )}
    </>
  );
}
