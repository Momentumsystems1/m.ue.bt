/**
 * Radial Command — context-driven planetary control.
 *
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │  Geometry (mathematically perfect, equal spacing):                 │
 *   │   • SUN diameter ............ 120 px (radius 60)                   │
 *   │   • ORBIT 1 ringRadius ....... 114 px  (macros, innermost)         │
 *   │   • ORBIT 2 ringRadius ....... 170 px  (sub-actions of active mode)│
 *   │   • ORBIT 3 ringRadius ....... 226 px  (steps of active sub-action)│
 *   │   • Δ between orbits ......... 56 px (constant)                    │
 *   │   • Planet diameter .......... 40 px                               │
 *   │   • Slots per orbit .......... 6  (60° apart, evenly distributed)  │
 *   │   • Container outer size ..... 540 px (2·226 + 40 + 48 pad)        │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * Behaviour:
 *   • Idle: only the SUN is rendered, with the label "Inicio".
 *   • Hover the sun → orbit 1 reveals (a center dot grows to the orbit's
 *     diameter), populated with macros.
 *   • Click a macro → orbit 2 reveals with the macro's sub-actions.
 *   • Click a sub-action that has `steps` → orbit 3 reveals with those steps.
 *     As the user completes a step, orbit 3 rotates so the NEXT step is at
 *     12 o'clock.
 */

// Theme — geometry & colour per orbit
export const RING_THEME = {
  orbit1: { name: "MENU",  color: "#22d3ee", glow: "rgba(34,211,238,0.55)",  radius: 114, planet: 38 },
  orbit2: { name: "ACCIÓN", color: "#fbbf24", glow: "rgba(251,191,36,0.55)", radius: 170, planet: 38 },
  orbit3: { name: "PASOS", color: "#c084fc", glow: "rgba(192,132,252,0.55)", radius: 226, planet: 40 },
};

export const SUN_DIAMETER = 120;
export const CONTAINER = 540;     // 2 × 226 + 88
export const CORE_SKINS = ["glass", "crystal", "minimal"];

// ---------------------------------------------------------------------------
//  MODES — each is a screen of the radial. Orbits are populated dynamically.
// ---------------------------------------------------------------------------
export const MODES = {
  main: {
    centerLabel: "Centrar",
    centerHint:  "Click para centrar mi posición",
    parent: null,
    defaultClickAction: "locate_me",
    orbit1: [
      { id: "navegador", icon: "Route",   label: "Navegador", desc: "Plan ruta multimodal",          type: "mode", targetMode: "navegador" },
      { id: "capas",     icon: "Layers",  label: "Capas",     desc: "Activar capas del mapa",         type: "mode", targetMode: "capas" },
      { id: "info",      icon: "Info",    label: "Info",      desc: "Detalle de un punto",            type: "mode", targetMode: "info" },
      { id: "cerca",     icon: "Compass", label: "Cerca",     desc: "POIs cerca del control",         type: "mode", targetMode: "cerca" },
      { id: "buscar",    icon: "Search",  label: "Buscar",    desc: "Geocodificar una dirección",     type: "mode", targetMode: "buscar" },
      { id: "yo",        icon: "User",    label: "Yo",        desc: "Mi posición y preferencias",     type: "mode", targetMode: "yo" },
    ],
    orbit2: [], orbit3: [],
  },

  navegador: {
    centerLabel: "Navegador",
    centerHint:  "Inicio · destino · opciones de ruta",
    parent: "main",
    activeOrbit1: "navegador",
    orbit1: "INHERIT",
    orbit2: [
      { id: "set_origin", icon: "MapPin", label: "Inicio", desc: "Escoger punto en mapa o escribir dirección", type: "action", action: "set_origin",
        steps: [
          { id: "origin-map", label: "Mapa", icon: "Crosshair", prompt: "Click en el mapa para INICIO", field: "origin", action: "pick_point" },
          { id: "origin-text", label: "Texto", icon: "Search", prompt: "Escribe o pega el inicio", field: "origin", action: "input_point" },
        ] },
      { id: "set_destination", icon: "Flag", label: "Destino", desc: "Escoger punto en mapa o escribir dirección", type: "action", action: "set_destination",
        steps: [
          { id: "destination-map", label: "Mapa", icon: "Crosshair", prompt: "Click en el mapa para DESTINO", field: "destination", action: "pick_point" },
          { id: "destination-text", label: "Texto", icon: "Search", prompt: "Escribe o pega el destino", field: "destination", action: "input_point" },
        ] },
      { id: "compute", icon: "Zap", label: "Optimizado", desc: "Calcular ruta optimizada", type: "action", action: "compute" },
      { id: "transport", icon: "Car", label: "Transportes", desc: "Usar transportes disponibles", type: "action", action: "cycle_transport" },
      { id: "destination_parking", icon: "ParkingCircle", label: "Parking", desc: "Al parking cercano en destino", type: "action", action: "destination_parking" },
      { id: "fuel_route", icon: "Zap", label: "Gasolineras", desc: "Gasolineras en mi ruta", type: "action", action: "fuel_route" },
      { id: "poi_route", icon: "Compass", label: "Interés", desc: "Puntos de interés en mi ruta", type: "action", action: "poi_route" },
      { id: "avoid_tolls", icon: "Route", label: "Sin peajes", desc: "Evitar peajes", type: "action", action: "avoid_tolls" },
      { id: "back", icon: "ArrowLeft", label: "Volver", desc: "Volver al menú principal", type: "mode", targetMode: "main" },
    ],
    orbit3: [],
  },

  capas: {
    centerLabel: "Capas",
    centerHint:  "Toggle capas sobre el mapa",
    parent: "main",
    activeOrbit1: "capas",
    orbit1: "INHERIT",
    orbit2: [
      { id: "trafico", icon: "AlertTriangle", label: "Tráfico", desc: "Atascos · obras · accidentes",  type: "toggle", value: "traffic"  },
      { id: "parking", icon: "ParkingCircle", label: "Parking", desc: "Aparcamientos cercanos",        type: "toggle", value: "parking"  },
      { id: "bicis",   icon: "Bike",          label: "Bicis",   desc: "Estaciones GBFS · patinetes",   type: "toggle", value: "bikes"    },
      { id: "ev",      icon: "Zap",           label: "EV",      desc: "Cargadores eléctricos",         type: "toggle", value: "ev"       },
      { id: "clima",   icon: "CloudRain",     label: "Clima",   desc: "Radar de lluvia · temperatura", type: "toggle", value: "weather"  },
      { id: "back",    icon: "ArrowLeft",     label: "Volver",  desc: "Volver al menú principal",      type: "mode",   targetMode: "main" },
    ],
    orbit3: [],
  },

  info: {
    centerLabel: "Info",
    centerHint:  "Inspecciona un punto del mapa",
    parent: "main",
    activeOrbit1: "info",
    orbit1: "INHERIT",
    orbit2: [
      { id: "pick",     icon: "Crosshair",     label: "Sobre punto", desc: "Click en el mapa para detalle",   type: "action", action: "pick_info" },
      { id: "incident", icon: "AlertTriangle", label: "Atascos",     desc: "Listar incidentes visibles",      type: "action", action: "list_incidents" },
      { id: "weather",  icon: "CloudRain",     label: "Clima",       desc: "Clima en el centro del mapa",     type: "action", action: "show_weather" },
      { id: "share",    icon: "Share2",        label: "Compartir",   desc: "Enlace de la vista actual",       type: "action", action: "share_view" },
      { id: "report",   icon: "Megaphone",     label: "Reportar",    desc: "Reportar incidente (mock)",       type: "action", action: "report" },
      { id: "back",     icon: "ArrowLeft",     label: "Volver",      desc: "Volver al menú principal",        type: "mode",   targetMode: "main" },
    ],
    orbit3: [],
  },

  cerca: {
    centerLabel: "Cerca",
    centerHint:  "POIs cerca del control",
    parent: "main",
    activeOrbit1: "cerca",
    orbit1: "INHERIT",
    orbit2: [
      { id: "park",  icon: "ParkingCircle", label: "Parking",   desc: "Plazas libres cerca",  type: "action", action: "search_nearby", value: "parking" },
      { id: "ev",    icon: "Zap",           label: "EV",        desc: "Cargadores cerca",      type: "action", action: "search_nearby", value: "ev" },
      { id: "bike",  icon: "Bike",          label: "Bicis",     desc: "Estaciones GBFS cerca", type: "action", action: "search_nearby", value: "bikes" },
      { id: "food",  icon: "Utensils",      label: "Comer",     desc: "Restaurantes cerca",    type: "action", action: "search_nearby", value: "food" },
      { id: "shop",  icon: "ShoppingBag",   label: "Tiendas",   desc: "Comercio cerca",        type: "action", action: "search_nearby", value: "shop" },
      { id: "back",  icon: "ArrowLeft",     label: "Volver",    desc: "Volver al menú principal", type: "mode", targetMode: "main" },
    ],
    orbit3: [],
  },

  buscar: {
    centerLabel: "Buscar",
    centerHint:  "Texto, voz o lugares recientes",
    parent: "main",
    activeOrbit1: "buscar",
    orbit1: "INHERIT",
    orbit2: [
      { id: "text",   icon: "Search",    label: "Texto",     desc: "Escribir dirección",        type: "action", action: "open_geocoder" },
      { id: "voice",  icon: "Mic",       label: "Voz",       desc: "Hablar dirección (futuro)", type: "action", action: "voice_search" },
      { id: "recent", icon: "Clock",     label: "Recientes", desc: "Búsquedas recientes",       type: "action", action: "recent_searches" },
      { id: "saved",  icon: "Bookmark",  label: "Guardado",  desc: "Lugares guardados",         type: "action", action: "saved_places" },
      { id: "near",   icon: "MapPin",    label: "Cerca",     desc: "POIs alrededor",            type: "mode",   targetMode: "cerca" },
      { id: "back",   icon: "ArrowLeft", label: "Volver",    desc: "Volver al menú principal",  type: "mode",   targetMode: "main" },
    ],
    orbit3: [],
  },

  yo: {
    centerLabel: "Yo",
    centerHint:  "Preferencias y posición",
    parent: "main",
    activeOrbit1: "yo",
    orbit1: "INHERIT",
    orbit2: [
      { id: "loc",      icon: "Crosshair",  label: "Mi pos.",   desc: "Centrar mapa en mi ubicación", type: "action", action: "locate_me" },
      { id: "skin",     icon: "Palette",    label: "Aspecto",   desc: "Cambiar skin del control",     type: "action", action: "cycle_skin" },
      { id: "minimize", icon: "Minimize2",  label: "Minimizar", desc: "Reducir el control",           type: "action", action: "minimize" },
      { id: "expert",   icon: "Wrench",     label: "Experto",   desc: "Abrir HUD avanzado",           type: "action", action: "expert_mode" },
      { id: "help",     icon: "HelpCircle", label: "Ayuda",     desc: "Atajos y guía rápida",         type: "action", action: "help" },
      { id: "back",     icon: "ArrowLeft",  label: "Volver",    desc: "Volver al menú principal",     type: "mode",   targetMode: "main" },
    ],
    orbit3: [],
  },
};

// ---------------------------------------------------------------------------
//  Utilities
// ---------------------------------------------------------------------------
export function planetsFor(mode, orbit) {
  const m = MODES[mode];
  if (!m) return [];
  let raw = m[orbit];
  if (raw === "INHERIT") raw = MODES.main.orbit1;
  return raw || [];
}

export function rotationForSlot(idx, total = 6) {
  if (idx < 0 || total <= 1) return 0;
  return -idx * (360 / total);
}

export function indexOfPlanet(planets, id) { return planets.findIndex((p) => p.id === id); }

export function findSubAction(mode, subId) {
  const list = MODES[mode]?.orbit2 || [];
  return list.find((p) => p.id === subId);
}
