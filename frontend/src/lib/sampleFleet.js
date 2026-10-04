// Flota de ejemplo para presentaciones sin credenciales: realista y con movimiento suave.
// Se usa SOLO cuando no hay sesión MY CLUSTER; la interfaz lo declara ("datos de ejemplo").
const BASE_MEMBERS = [
  { user_id: "ej-1", name: "Lucía Ferrer", color: "#EA4335", lat: 40.4168, lng: -3.7038, mode: "walk" },
  { user_id: "ej-2", name: "Marco Ruiz", color: "#1A73E8", lat: 40.4231, lng: -3.6876, mode: "bike" },
  { user_id: "ej-3", name: "Ana Beltrán", color: "#34A853", lat: 40.4089, lng: -3.6922, mode: "car" },
  { user_id: "ej-4", name: "Pablo Serna", color: "#F9AB00", lat: 40.4302, lng: -3.7105, mode: "walk" },
  { user_id: "ej-5", name: "Elena Vidal", color: "#9334E6", lat: 40.4145, lng: -3.7188, mode: "bike" },
  { user_id: "ej-6", name: "Hugo Marín", color: "#06AED5", lat: 40.4267, lng: -3.6765, mode: "car" },
];

export const SAMPLE_ZONES = [
  { id: "z-1", name: "Oficina central", lat: 40.4200, lng: -3.7025, radius_m: 250, is_active: true },
  { id: "z-2", name: "Centro logístico", lat: 40.4090, lng: -3.6880, radius_m: 400, is_active: true },
  { id: "z-3", name: "Zona de bajas emisiones", lat: 40.4175, lng: -3.7150, radius_m: 600, is_active: true },
];

export const SAMPLE_MEETINGS = [
  { id: "m-1", name: "Revisión semanal de flota", place_name: "Oficina central", lat: 40.4200, lng: -3.7025, scheduled_at: null, duration_min: 60, status: "active" },
  { id: "m-2", name: "Turno tarde — reparto última milla", place_name: "Centro logístico", lat: 40.4090, lng: -3.6880, scheduled_at: null, duration_min: 120, status: "active" },
];

// Trail agregado de ejemplo (resumen del día ya calculado)
export const SAMPLE_CO2 = {
  kmTotal: 87.4,
  kmClean: 41.2,
  kgCo2: 41.2 * 0.12,
  members: 6,
  modes: { walk: 18.6, bike: 22.6, car: 46.2, other: 0 },
};

const jit = {};
export function samplePositions(tick = 0) {
  // Pequeño desplazamiento determinista por tick para que el mapa respire
  return BASE_MEMBERS.map((m, i) => {
    const k = m.user_id;
    if (!jit[k]) jit[k] = { dx: 0, dy: 0 };
    const ang = (tick / 6 + i) % (Math.PI * 2);
    const r = 0.0006 + (i % 3) * 0.0004;
    return {
      member_id: k, user_id: m.user_id, name: m.name, color: m.color,
      state: "shared", is_me: false,
      lat: m.lat + Math.sin(ang) * r,
      lng: m.lng + Math.cos(ang) * r,
      updated_at: new Date(Date.now() - (i + 1) * 40000).toISOString(),
      mode: m.mode,
    };
  });
}
