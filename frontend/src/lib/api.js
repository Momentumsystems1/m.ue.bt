import axios from "axios";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Global error interceptor — log but don't crash the UI
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err?.config?.url || "";
    const status = err?.response?.status;
    const msg = err?.response?.data?.detail || err?.message || "Network error";
    console.warn(`[API] ${status || "ERR"} ${url} — ${msg}`);
    return Promise.reject(err);
  }
);

// Simple retry wrapper for critical calls
async function withRetry(fn, retries = 2, delayMs = 800) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export const fetchEvents = (city, lat, lon, radius_km = 150) =>
  withRetry(() => api.get("/events", { params: { city, lat, lon, radius_km } }).then((r) => r.data));

export const fetchParking = (lat, lon, radius = 1500) =>
  api.get("/parking", { params: { lat, lon, radius } }).then((r) => r.data);

export const fetchCities = () => api.get("/cities").then((r) => r.data);

export const fetchHealth = () => api.get("/health").then((r) => r.data);

export const geocode = (q) => api.get("/geocode", { params: { q } }).then((r) => r.data);

export const fetchRoute = (from_q, to_q, mode = "car") =>
  withRetry(() => api.get("/route", { params: { from: from_q, to: to_q, mode } }).then((r) => r.data));

// ----- Azure Maps proxy endpoints -----
export const azureStatus = () => api.get("/azure/status").then((r) => r.data);

export const azureRoute = (from_q, to_q, mode = "car", traffic = true, extra = {}) =>
  api.get("/azure/route", {
    params: { from: from_q, to: to_q, mode, traffic, ...extra },
  }).then((r) => r.data);

export const azureRange = (lat, lon, minutes = 15, mode = "car") =>
  api.get("/azure/range", { params: { lat, lon, minutes, mode } }).then((r) => r.data);

export const azureSearchEV = (lat, lon, radius = 10000, limit = 50, connector = undefined) =>
  api.get("/azure/search/ev", { params: { lat, lon, radius, limit, connector } }).then((r) => r.data);

export const azureSearchPOI = (q, lat, lon, radius = 5000, limit = 30) =>
  api.get("/azure/search/poi", { params: { q, lat, lon, radius, limit } }).then((r) => r.data);

export const azureIncidents = (bbox, zoom = 11) =>
  api.get("/azure/incidents", { params: { bbox, zoom } }).then((r) => r.data);

export const azureWeatherCurrent = (lat, lon) =>
  api.get("/azure/weather/current", { params: { lat, lon } }).then((r) => r.data);

export const azureWeatherAlerts = (lat, lon) =>
  api.get("/azure/weather/alerts", { params: { lat, lon } }).then((r) => r.data);

// Returns absolute URL for Azure tile proxy (used by MapLibre tile sources)
export const azureTileUrl = (kind) => {
  const base = `${BACKEND_URL}/api/azure/tile/${kind}`;
  return `${base}/{z}/{x}/{y}`;
};

// ----- Mobility hub (CityBikes GBFS aggregator + ride-hailing deep-links) -----
export const fetchMobilityStations = (lat, lon, radius_km = 3.0, country = "ES") =>
  api.get("/mobility/stations", { params: { lat, lon, radius_km, country } }).then((r) => r.data);

export const fetchRideDeeplinks = (from_lat, from_lon, to_lat, to_lon) =>
  api.get("/mobility/ride/deeplinks", {
    params: { from_lat, from_lon, to_lat, to_lon },
  }).then((r) => r.data);

export const fetchUberEstimates = (start_lat, start_lon, end_lat, end_lon) =>
  api.get("/uber/estimates", { params: { start_lat, start_lon, end_lat, end_lon } }).then((r) => r.data);

export const fetchUberStatus = () => api.get("/uber/status").then((r) => r.data);

// ----- Multimodal trip planner -----
export const fetchMultimodalPlan = (from_lat, from_lon, to_lat, to_lon) =>
  withRetry(() =>
    api.get("/multimodal/plan", {
      params: { from_lat, from_lon, to_lat, to_lon },
    }).then((r) => r.data)
  );
