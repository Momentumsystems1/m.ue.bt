// Panel MY CLUSTER para el Centro de Mando: equipo en vivo, CO₂, cercas y quedadas.
// Con sesión real muestra el grupo del usuario; sin credenciales, datos de ejemplo (declarado).
import React, { useMemo, useState } from "react";
import { Users, Leaf, Shield, CalendarClock, X, MapPin } from "lucide-react";

const MODE_LABEL = { walk: "A pie", bike: "Bici", car: "Coche", other: "Otro" };
const MODE_COLOR = { walk: "#81C995", bike: "#FDD663", car: "#F28B82", other: "#9AA0A6" };

function timeAgo(iso) {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  return `hace ${Math.floor(s / 3600)} h`;
}

function fmtWhen(iso, dur) {
  if (!iso) return "Hora por confirmar";
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const hm = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const day = sameDay ? "Hoy" : d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  return `${day} · ${hm} h${dur ? ` · ${dur} min` : ""}`;
}

const initials = (n = "") => n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "·";

export default function MyClusterPanel({ session, positions = [], meetings = [], zones = [], co2 = null, groupName = "", onFlyTo }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("flota");
  const sample = session === "sample";
  const members = useMemo(() => (Array.isArray(positions) ? positions : []), [positions]);
  const cleanPct = co2 && co2.kmTotal > 0 ? Math.round((co2.kmClean / co2.kmTotal) * 100) : 0;

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        data-testid="myc-launcher"
        onClick={() => setOpen((v) => !v)}
        className="absolute top-[60px] left-4 z-[45] panel px-3 py-2 flex items-center gap-2 hover:border-cyan-300 transition-colors"
        style={{ pointerEvents: "auto", background: "rgba(20,21,24,0.88)" }}
      >
        <span className="live-dot" />
        <Users className="w-3.5 h-3.5 text-cyan-300" />
        <span className="font-mono text-[10px] tracking-[0.22em] text-cyan-200">MI EQUIPO</span>
        <span className="font-mono text-[10px] text-cyan-100 tabular-nums">{members.length}</span>
      </button>

      {open && (
        <div
          data-testid="myc-panel"
          className="absolute left-4 top-[104px] z-[45] panel brackets flex flex-col anim-fade-up"
          style={{ width: "min(360px, 92vw)", maxHeight: "72vh", background: "rgba(20,21,24,0.92)" }}
        >
          <div className="section-head">
            <span>{groupName ? `${groupName.toUpperCase()} · MY CLUSTER` : "MY CLUSTER · EQUIPO"}</span>
            <button type="button" data-testid="myc-close" onClick={() => setOpen(false)} className="text-cyan-300/70 hover:text-cyan-100"><X className="w-3.5 h-3.5" /></button>
          </div>

          {sample && (
            <div className="px-3 py-1.5 border-b border-cyan-500/15 font-mono text-[9px] tracking-[0.18em] text-amber-300/90">
              DATOS DE EJEMPLO · SIN CONEXIÓN A GRUPO REAL
            </div>
          )}

          {/* Tabs */}
          <div className="grid grid-cols-4 border-b border-cyan-500/15">
            {[
              ["flota", "Flota", Users],
              ["co2", "CO₂", Leaf],
              ["cercas", "Cercas", Shield],
              ["quedadas", "Quedadas", CalendarClock],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                data-testid={`myc-tab-${id}`}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-1 py-2 font-mono text-[9px] tracking-[0.14em] border-b-2 transition-colors ${tab === id ? "text-cyan-100 border-cyan-400 bg-cyan-500/10" : "text-cyan-500/60 border-transparent hover:text-cyan-200"}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === "flota" && (
              <div data-testid="myc-flota" className="divide-y divide-cyan-500/10">
                {members.length === 0 && <div className="px-3 py-4 text-[11px] text-cyan-500/70 font-mono">[ SIN MIEMBROS ACTIVOS ]</div>}
                {members.map((m) => (
                  <button
                    key={m.user_id || m.member_id}
                    type="button"
                    data-testid={`myc-member-${m.user_id || m.member_id}`}
                    onClick={() => m.lat != null && onFlyTo && onFlyTo(m.lng, m.lat)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-cyan-500/5 transition-colors"
                  >
                    <span className="grid place-items-center rounded-full text-[10px] font-bold text-white shrink-0" style={{ width: 30, height: 30, background: m.color || "#EA4335", boxShadow: `0 0 0 2px ${(m.color || "#EA4335")}44` }}>
                      {initials(m.name)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] font-semibold text-cyan-50 truncate">{m.name || "Miembro"}</span>
                      <span className="block font-mono text-[9px] tracking-wider text-cyan-500/80">
                        {(MODE_LABEL[m.mode] || "En movimiento").toUpperCase()} · {(m.updated_at ? timeAgo(m.updated_at) : "EN VIVO").toUpperCase()}
                      </span>
                    </span>
                    <MapPin className="w-3.5 h-3.5 text-cyan-500/60 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {tab === "co2" && (
              <div data-testid="myc-co2" className="px-3 py-3 space-y-3">
                {!co2 && <div className="text-[11px] text-cyan-500/70 font-mono">[ CALCULANDO TRAYECTOS DE HOY ]</div>}
                {co2 && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="border border-cyan-500/15 px-2 py-2 text-center">
                        <div className="font-mono text-[8px] tracking-[0.18em] text-cyan-500/80">CO₂ EVITADO</div>
                        <div className="text-lg font-bold text-emerald-300 tabular-nums">{co2.kgCo2.toFixed(1)}<span className="text-[10px] ml-0.5">kg</span></div>
                      </div>
                      <div className="border border-cyan-500/15 px-2 py-2 text-center">
                        <div className="font-mono text-[8px] tracking-[0.18em] text-cyan-500/80">KM HOY</div>
                        <div className="text-lg font-bold text-cyan-100 tabular-nums">{co2.kmTotal.toFixed(1)}</div>
                      </div>
                      <div className="border border-cyan-500/15 px-2 py-2 text-center">
                        <div className="font-mono text-[8px] tracking-[0.18em] text-cyan-500/80">% LIMPIO</div>
                        <div className="text-lg font-bold text-emerald-300 tabular-nums">{cleanPct}%</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] tracking-[0.18em] text-cyan-500/80 mb-1.5">REPARTO MODAL · KM</div>
                      <div className="space-y-1.5">
                        {Object.entries(co2.modes || {}).filter(([, v]) => v > 0.05).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-2 text-[11px]">
                            <span className="font-mono tracking-wide text-cyan-200 w-16 uppercase">{MODE_LABEL[k] || k}</span>
                            <div className="flex-1 h-1.5 bg-cyan-900/40 overflow-hidden border border-cyan-500/15">
                              <div className="h-full" style={{ width: `${Math.min(100, (v / (co2.kmTotal || 1)) * 100)}%`, background: MODE_COLOR[k] || "#9AA0A6" }} />
                            </div>
                            <span className="font-mono text-[10px] text-cyan-100 tabular-nums w-12 text-right">{v.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="font-mono text-[8px] leading-relaxed tracking-wider text-cyan-500/60">
                      FACTOR 0,12 KG CO₂/KM · TRAYECTOS SIN COCHE COMPUTADOS COMO EVITADOS
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "cercas" && (
              <div data-testid="myc-cercas" className="divide-y divide-cyan-500/10">
                {zones.length === 0 && <div className="px-3 py-4 text-[11px] text-cyan-500/70 font-mono">[ SIN CERCAS DEFINIDAS ]</div>}
                {zones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    data-testid={`myc-zone-${z.id}`}
                    onClick={() => z.lat != null && onFlyTo && onFlyTo(z.lng, z.lat)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-cyan-500/5 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-cyan-300 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] font-semibold text-cyan-50 truncate">{z.name}</span>
                      <span className="block font-mono text-[9px] tracking-wider text-cyan-500/80">RADIO {z.radius_m ?? z.radius ?? "—"} M</span>
                    </span>
                    <span className={`font-mono text-[9px] tracking-wider ${z.is_active === false ? "text-zinc-500" : "text-emerald-400"}`}>{z.is_active === false ? "○ ESPERA" : "● ACTIVA"}</span>
                  </button>
                ))}
              </div>
            )}

            {tab === "quedadas" && (
              <div data-testid="myc-quedadas" className="divide-y divide-cyan-500/10">
                {meetings.length === 0 && <div className="px-3 py-4 text-[11px] text-cyan-500/70 font-mono">[ SIN QUEDADAS ACTIVAS ]</div>}
                {meetings.map((mt) => (
                  <button
                    key={mt.id}
                    type="button"
                    data-testid={`myc-meeting-${mt.id}`}
                    onClick={() => mt.lat != null && onFlyTo && onFlyTo(mt.lng, mt.lat)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-cyan-500/5 transition-colors"
                  >
                    <CalendarClock className="w-4 h-4 text-cyan-300 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] font-semibold text-cyan-50 truncate">{mt.name || "Quedada"}</span>
                      <span className="block font-mono text-[9px] tracking-wider text-cyan-500/80 truncate">{(mt.place_name || "Lugar por confirmar").toUpperCase()}</span>
                      <span className="block font-mono text-[9px] tracking-wider text-cyan-300/90">{fmtWhen(mt.scheduled_at, mt.duration_min).toUpperCase()}</span>
                    </span>
                    <MapPin className="w-3.5 h-3.5 text-cyan-500/60 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
