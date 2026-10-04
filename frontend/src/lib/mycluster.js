// MY CLUSTER data layer for the Command Center.
// Auth + dominio (grupos, posiciones, quedadas) via sentinel-api (edge function);
// tablas (cercas, trail de CO2) via PostgREST con el token del usuario.
// La anon key es una clave pública de cliente (misma que lleva la app móvil).
const SUPA = process.env.REACT_APP_MYC_SUPA || "https://nvannetdrfybowwjqqhf.supabase.co";
const ANON = process.env.REACT_APP_MYC_ANON || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52YW5uZXRkcmZ5Ym93d2pxcWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMjg2OTAsImV4cCI6MjEwNDYwNDY5MH0.O1YFOBJskLYQAPHuWSktDg6wkguXjdWZqkgZ3CH_hdY";
const API = `${SUPA}/functions/v1/sentinel-api/api`;
const LS_KEY = "mc.session";

export function loadSession() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
}
export function saveSession(s) { localStorage.setItem(LS_KEY, JSON.stringify(s)); }
export function clearSession() { localStorage.removeItem(LS_KEY); }

async function req(path, { method = "GET", token, body } = {}) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      apikey: ANON,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.detail?.title || d?.msg || `Error ${r.status}`);
  return d;
}

async function rest(table, query, token) {
  const r = await fetch(`${SUPA}/rest/v1/${table}?${query}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Error ${r.status}`);
  return r.json();
}

export async function login(email, password) {
  const d = await req("/auth/login", { method: "POST", body: { email, password } });
  const s = { token: d.access_token, refresh: d.refresh_token, name: d.user?.profile?.name || email.split("@")[0], userId: d.user?.id };
  saveSession(s);
  return s;
}

export async function fetchGroup(token) {
  const groups = await req("/groups", { token });
  return Array.isArray(groups) && groups.length ? groups[0] : null;
}

export async function fetchPositions(token, groupId) {
  return req(`/groups/${groupId}/positions`, { token });
}

export async function fetchMeetings(token, groupId) {
  const rows = await req(`/groups/${groupId}/meetings`, { token });
  return (Array.isArray(rows) ? rows : []).filter((m) => m.status === "active");
}

export async function fetchAgenda(token, groupId) {
  return req(`/groups/${groupId}/agenda`, { token });
}

export async function fetchZones(token, groupId) {
  return rest("zones", `group_id=eq.${groupId}&select=*&order=created_at.asc`, token);
}

// CO2 del día: mismo cálculo que la app — trail de ubicaciones, km sin coche × 0,12 kg/km
const CO2_PER_KM = 0.12;
const distM = (a, b) => {
  const R = 6371000, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
export async function fetchTodayTrail(token, groupId) {
  const since = new Date(); since.setHours(0, 0, 0, 0);
  return rest("location_trail", `group_id=eq.${groupId}&at=gte.${encodeURIComponent(since.toISOString())}&order=user_id.asc,at.asc&limit=2000&select=*`, token);
}
export function summarizeTrail(rows) {
  let totalM = 0, cleanM = 0;
  const byUser = new Map();
  (rows || []).forEach((r) => {
    const a = byUser.get(r.user_id) || []; a.push(r); byUser.set(r.user_id, a);
  });
  const modes = { walk: 0, bike: 0, car: 0, other: 0 };
  byUser.forEach((list) => {
    for (let i = 1; i < list.length; i++) {
      const d = distM(list[i - 1], list[i]);
      if (d > 2000) continue;
      totalM += d;
      const mode = list[i].mode || "other";
      modes[mode] = (modes[mode] || 0) + d;
      if (mode !== "car") cleanM += d;
    }
  });
  return {
    kmTotal: totalM / 1000,
    kmClean: cleanM / 1000,
    kgCo2: (cleanM / 1000) * CO2_PER_KM,
    members: byUser.size,
    modes: Object.fromEntries(Object.entries(modes).map(([k, v]) => [k, v / 1000])),
  };
}
