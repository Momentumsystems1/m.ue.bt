/**
 * Shared constants for event kinds, labels, icons, severity colors and HUD subroutines.
 * Extracted from CommandCenter.jsx to reduce its size and complexity.
 */
import {
  Radio, AlertTriangle, Construction, OctagonAlert, TrendingUp, CloudRain,
} from "lucide-react";

export const KIND_ICON = {
  obras: Construction,
  accidente: AlertTriangle,
  congestion: TrendingUp,
  peligro: OctagonAlert,
  meteo: CloudRain,
  incidencia: Radio,
};

export const KIND_GLYPH = {
  obras: "!",
  accidente: "X",
  congestion: "≋",
  peligro: "▲",
  meteo: "~",
  incidencia: "i",
};

export const KIND_LABEL = {
  obras: "OBRAS",
  accidente: "ACCIDENTE",
  congestion: "CONGESTIÓN",
  peligro: "PELIGRO",
  meteo: "METEO",
  incidencia: "INCIDENCIA",
};

export const SEV_COLOR = {
  critical: "var(--accidente)",
  warning: "var(--obras)",
  info: "var(--cyan)",
};

export const SUBROUTINES = [
  ["F-01", "DGT · DATEX2 EN VIVO",   "ACTIVO"],
  ["F-02", "SCT CATALUNYA",          "ACTIVO"],
  ["F-03", "MADRID ABIERTO",         "ACTIVO"],
  ["F-04", "PARKING OSM",            "ESPERA"],
  ["F-05", "GEOCODIFICACIÓN",        "ESPERA"],
  ["F-06", "MAPA BASE",              "ACTIVO"],
  ["F-07", "TERRENO 3D",             "ESPERA"],
  ["F-08", "CLASIFICADOR",           "ACTIVO"],
  ["F-09", "MATRIZ DE GRAVEDAD",     "ACTIVO"],
  ["F-10", "FILTRO GEOGRÁFICO",      "ACTIVO"],
  ["F-11", "AGREGADOR PARKING",      "ESPERA"],
  ["F-12", "OPTIMIZADOR DE RUTA",    "ACTIVO"],
  ["F-13", "MAPA DE DENSIDAD",       "ESPERA"],
  ["F-14", "EXPORTACIÓN PDF",        "ACTIVO"],
];

export const fmtTime = (d) => {
  if (!d) return "--:--:--";
  return d.toLocaleTimeString("es-ES", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
};

export const pad = (n, w = 4) => String(n).padStart(w, "0");
