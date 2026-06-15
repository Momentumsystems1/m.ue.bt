import axios from "axios";

// ── Resolve backend URL ──────────────────────────────────────────────────────
// Priority:
//   1. REACT_APP_BACKEND_URL (set in Render / .env)
//   2. Same-origin /api  (if frontend + backend are served together)
// Never falls back to localhost in production builds.
const _raw = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
export const BACKEND_URL = _raw;
export const API = _raw ? `${_raw}/api` : "/api";

console.info(`[api] base URL: ${API}`);

export const api = axios.create({
  baseURL: API,
  timeout: 25000,
  headers: { "Content-Type": "application/json" },
});

// Global error interceptor — log, never crash UI
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url    = err?.config?.url || "";
    const status = err?.response?.status;
    const msg    = err?.response?.data?.detail || err?.message || "Network error";
    console.warn(`[API] ${status ?? "ERR"} ${url} — ${msg}`);
    return Promise.reject(err);
  }
);

// Retry helper for critical calls
async function withRetry(fn, retries = 2, delayMs = 900) {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

// ── Core endpoints ───────────────────────────────────────────────────────────
export const fetchHealth = () =>
  api.get("/health").then(r => r.data);

export const fetchCities = () =>
  api.get("/cities").then(r => r.data);

export const fetchEvents = (city = "madrid", lat, lon, radius_km = 150) =>
  withRetry(() =>
    api.get("/events", { params: { city, lat, lon, radius_km } }).then(r => r.data)
  );

export const fetchParking = (lat, lon, radius = 1500) =>
  api.get("/parking", { params: { lat, lon, radius } }).then(r => r.data);

export const geocode = (q) =>
  api.get("/geocode", { params: { q } }).then(r => r.data);

// ── Route ────────────────────────────────────────────────────────────────────
// Backend expects query params: from=<text or lat,lon>  to=<text or lat,lon>  mode=car|foot|bike|transit
export const fetchRoute = (from_q, to_q, mode = "car") =>
  withRetry(() =>
    api.get("/route", { params: { from: from_q, to: to_q, mode } }).then(r => r.data)
  );

// ── Azure Maps proxy ─────────────────────────────────────────────────────────
export const azureStatus = () =>
  api.get("/azure/status").then(r => r.data).catch(() => ({ available: false }));

export const azureRoute = (from_q, to_q, mode = "car", traffic = true) =>
  api.get("/azure/route", { params: { from: from_q, to: to_q, mode, traffic } }).then(r => r.data);

export const azureRange = (lat, lon, minutes = 15, mode = "car") =>
  api.get("/azure/range", { params: { lat, lon, minutes, mode } }).then(r => r.data);

export const azureSearchEV = (lat, lon, radius = 10000, limit = 50) =>
  api.get("/azure/search/ev", { params: { lat, lon, radius, limit } }).then(r => r.data);

export const azureSearchPOI = (q, lat, lon, radius = 5000, limit = 30) =>
  api.get("/azure/search/poi", { params: { q, lat, lon, radius, limit } }).then(r => r.data);

export const azureIncidents = (bbox, zoom = 11) =>
  api.get("/azure/incidents", { params: { bbox, zoom } }).then(r => r.data);

export const azureWeatherCurrent = (lat, lon) =>
  api.get("/azure/weather/current", { params: { lat, lon } }).then(r => r.data);

// Tile proxy URL — MapLibre uses this as a tile source
// The backend injects the Azure key server-side, so no key needed in frontend
export const azureTileUrl = (kind) =>
  `${API}/azure/tile/${kind}/{z}/{x}/{y}`;

// ── Mobility ─────────────────────────────────────────────────────────────────
export const fetchMobilityStations = (lat, lon, radius_km = 3.0, country = "ES") =>
  api.get("/mobility/stations", { params: { lat, lon, radius_km, country } }).then(r => r.data);

export const fetchRideDeeplinks = (from_lat, from_lon, to_lat, to_lon) =>
  api.get("/mobility/ride/deeplinks", { params: { from_lat, from_lon, to_lat, to_lon } }).then(r => r.data);

export const fetchMultimodalPlan = (from_lat, from_lon, to_lat, to_lon) =>
  withRetry(() =>
    api.get("/multimodal/plan", { params: { from_lat, from_lon, to_lat, to_lon } }).then(r => r.data)
  );
