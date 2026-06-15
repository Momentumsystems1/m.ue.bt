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
 */

export const RING_THEME = {
  orbit1: { name: "MENU",   color: "#22d3ee", glow: "rgba(34,211,238,0.55)",  radius: 114, planet: 38 },
  orbit2: { name: "ACCIÓN", color: "#fbbf24", glow: "rgba(251,191,36,0.55)",  radius: 170, planet: 38 },
  orbit3: { name: "PASOS",  color: "#c084fc", glow: "rgba(192,132,252,0.55)", radius: 226, planet: 40 },
};

export const SUN_DIAMETER = 120;
export const CONTAINER = 540;
export const CORE_SKINS = ["glass", "crystal", "minimal"];

export const MODES = {
  main: {
    centerLabel: "Inicio",
    centerHint:  "Click para centrar mi posición",
    parent: null,
    defaultClickAction: "locate_me",
    orbit1: [
      { id: "navegador", icon: "Route",    label: "Navegador", desc: "Planifica tu ruta multimodal",   type: "mode", targetMode: "navegador" },
      { id: "capas",     icon: "Layers",   label: "Capas",     desc: "Tráfico · parking · bicis",      type: "mode", targetMode: "capas" },
      { id: "info",      icon: "Info",     label: "Info",      desc: "Detalle de un punto del mapa",   type: "mode", targetMode: "info" },
      { id: "cerca",     icon: "Compass",  label: "Cerca",     desc: "POIs cerca de aquí",             type: "mode", targetMode: "cerca" },
      { id: "buscar",    icon: "Search",   label: "Buscar",    desc: "Dirección o lugar",              type: "mode", targetMode: "buscar" },
      { id: "yo",        icon: "User",     label: "Yo",        desc: "Mi posición y preferencias",     type: "mode", targetMode: "yo" },
    ],
    orbit2: [], orbit3: [],
  },

  navegador: {
    centerLabel: "Navegar",
    centerHint:  "Origen · destino · calcular",
    parent: "main",
    activeOrbit1: "navegador",
    orbit1: "INHERIT",
    orbit2: [
      {
        id: "set_origin", icon: "MapPin", label: "Inicio",
        desc: "Elige tu punto de inicio en el mapa o escribe la dirección",
        type: "action", action: "set_origin",
        steps: [
          { id: "origin-map",  label: "En mapa",  icon: "Crosshair", prompt: "Haz click en el mapa para fijar el INICIO", field: "origin",      action: "pick_point"  },
          { id: "origin-text", label: "Escribir", icon: "Search",    prompt: "Escribe la dirección de inicio",            field: "origin",      action: "input_point" },
        ],
      },
      {
        id: "set_destination", icon: "Flag", label: "Destino",
        desc: "Elige tu destino en el mapa o escribe la dirección",
        type: "action", action: "set_destination",
        steps: [
          { id: "destination-map",  label: "En mapa",  icon: "Crosshair", prompt: "Haz click en el mapa para fijar el DESTINO", field: "destination", action: "pick_point"  },
          { id: "destination-text", label: "Escribir", icon: "Search",    prompt: "Escribe la dirección de destino",             field: "destination", action: "input_point" },
        ],
      },
      { id: "compute",              icon: "Zap",           label: "Calcular",  desc: "Calcular la mejor ruta",                  type: "action", action: "compute"              },
      { id: "transport",            icon: "Car",           label: "Modo",      desc: "Cambiar modo de transporte",              type: "action", action: "cycle_transport"      },
      { id: "destination_parking",  icon: "ParkingCircle", label: "Parking",   desc: "Parking cerca del destino",               type: "action", action: "destination_parking"  },
      { id: "avoid_tolls",          icon: "Route",         label: "Sin peajes",desc: "Evitar autopistas de peaje",              type: "action", action: "avoid_tolls"          },
      { id: "reset_route",          icon: "RotateCcw",     label: "Limpiar",   desc: "Borrar origen y destino",                 type: "action", action: "reset_route"          },
      { id: "back",                 icon: "ArrowLeft",     label: "Menú",      desc: "Volver al menú principal",                type: "mode",   targetMode: "main"             },
    ],
    orbit3: [],
  },

  capas: {
    centerLabel: "Capas",
    centerHint:  "Activa o desactiva capas",
    parent: "main",
    activeOrbit1: "capas",
    orbit1: "INHERIT",
    orbit2: [
      { id: "trafico", icon: "AlertTriangle", label: "Tráfico", desc: "Flujo e incidencias en tiempo real", type: "toggle", value: "traffic"  },
      { id: "parking", icon: "ParkingCircle", label: "Parking", desc: "Aparcamientos disponibles",         type: "toggle", value: "parking"  },
      { id: "bicis",   icon: "Bike",          label: "Bicis",   desc: "Estaciones GBFS y patinetes",       type: "toggle", value: "bikes"    },
      { id: "ev",      icon: "Zap",           label: "EV",      desc: "Puntos de carga eléctrica",         type: "toggle", value: "ev"       },
      { id: "clima",   icon: "CloudRain",     label: "Clima",   desc: "Radar de precipitaciones",          type: "toggle", value: "weather"  },
      { id: "back",    icon: "ArrowLeft",     label: "Menú",    desc: "Volver al menú principal",          type: "mode",   targetMode: "main" },
    ],
    orbit3: [],
  },

  info: {
    centerLabel: "Info",
    centerHint:  "Inspecciona el mapa",
    parent: "main",
    activeOrbit1: "info",
    orbit1: "INHERIT",
    orbit2: [
      { id: "pick_info",       icon: "Crosshair",     label: "Punto",    desc: "Toca el mapa para ver detalles",    type: "action", action: "pick_info"       },
      { id: "list_incidents",  icon: "AlertTriangle", label: "Atascos",  desc: "Listar incidencias visibles",       type: "action", action: "list_incidents"  },
      { id: "show_weather",    icon: "CloudRain",     label: "Tiempo",   desc: "Condiciones meteorológicas",        type: "action", action: "show_weather"    },
      { id: "share_view",      icon: "Share2",        label: "Compartir",desc: "Enlace de la vista actual",         type: "action", action: "share_view"      },
      { id: "report",          icon: "Megaphone",     label: "Reportar", desc: "Reportar una incidencia",           type: "action", action: "report"          },
      { id: "back",            icon: "ArrowLeft",     label: "Menú",     desc: "Volver al menú principal",          type: "mode",   targetMode: "main"        },
    ],
    orbit3: [],
  },

  cerca: {
    centerLabel: "Cerca",
    centerHint:  "POIs alrededor de aquí",
    parent: "main",
    activeOrbit1: "cerca",
    orbit1: "INHERIT",
    orbit2: [
      { id: "near_park",  icon: "ParkingCircle", label: "Parking",    desc: "Plazas libres cercanas",      type: "action", action: "search_nearby", value: "parking" },
      { id: "near_ev",    icon: "Zap",           label: "Carga EV",   desc: "Cargadores eléctricos cerca", type: "action", action: "search_nearby", value: "ev"      },
      { id: "near_bike",  icon: "Bike",          label: "Bicis",      desc: "Estaciones GBFS cerca",       type: "action", action: "search_nearby", value: "bikes"   },
      { id: "near_food",  icon: "Utensils",      label: "Comer",      desc: "Restaurantes cerca",          type: "action", action: "search_nearby", value: "food"    },
      { id: "near_shop",  icon: "ShoppingBag",   label: "Tiendas",    desc: "Comercio cercano",            type: "action", action: "search_nearby", value: "shop"    },
      { id: "back",       icon: "ArrowLeft",     label: "Menú",       desc: "Volver al menú principal",    type: "mode",   targetMode: "main"                       },
    ],
    orbit3: [],
  },

  buscar: {
    centerLabel: "Buscar",
    centerHint:  "Dirección o lugar",
    parent: "main",
    activeOrbit1: "buscar",
    orbit1: "INHERIT",
    orbit2: [
      { id: "text_search",    icon: "Search",    label: "Dirección",  desc: "Escribir dirección o lugar",   type: "action", action: "open_geocoder"    },
      { id: "voice_search",   icon: "Mic",       label: "Voz",        desc: "Buscar por voz (próx.)",       type: "action", action: "voice_search"     },
      { id: "recent_search",  icon: "Clock",     label: "Recientes",  desc: "Últimas búsquedas",            type: "action", action: "recent_searches"  },
      { id: "saved_places",   icon: "Bookmark",  label: "Guardados",  desc: "Mis lugares favoritos",        type: "action", action: "saved_places"     },
      { id: "near_mode",      icon: "MapPin",    label: "Cerca",      desc: "POIs alrededor",               type: "mode",   targetMode: "cerca"        },
      { id: "back",           icon: "ArrowLeft", label: "Menú",       desc: "Volver al menú principal",     type: "mode",   targetMode: "main"         },
    ],
    orbit3: [],
  },

  yo: {
    centerLabel: "Yo",
    centerHint:  "Mi posición y preferencias",
    parent: "main",
    activeOrbit1: "yo",
    orbit1: "INHERIT",
    orbit2: [
      { id: "locate_me",   icon: "Crosshair",  label: "Mi pos.",   desc: "Centrar mapa en mi ubicación",  type: "action", action: "locate_me"   },
      { id: "cycle_skin",  icon: "Palette",    label: "Aspecto",   desc: "Cambiar skin del control",      type: "action", action: "cycle_skin"  },
      { id: "minimize",    icon: "Minimize2",  label: "Minimizar", desc: "Minimizar el control",          type: "action", action: "minimize"    },
      { id: "expert",      icon: "Wrench",     label: "Experto",   desc: "Modo experto con HUD completo", type: "action", action: "expert_mode" },
      { id: "help",        icon: "HelpCircle", label: "Ayuda",     desc: "Guía de uso del control",       type: "action", action: "show_help"   },
      { id: "back",        icon: "ArrowLeft",  label: "Menú",      desc: "Volver al menú principal",      type: "mode",   targetMode: "main"    },
    ],
    orbit3: [],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the planets array for a given mode + orbit key.
 *  "INHERIT" on orbit1 means copy from the current mode's entry. */
export function planetsFor(modeName, orbitKey) {
  const cfg = MODES[modeName];
  if (!cfg) return [];
  const raw = cfg[orbitKey];
  if (!raw) return [];
  if (raw === "INHERIT") {
    // orbit1 inherits from current mode's own orbit1 array
    const own = MODES[modeName]?.orbit1;
    if (!own || own === "INHERIT") return MODES.main.orbit1;
    return own;
  }
  return raw;
}

/** The rotation (degrees) so that slot `idx` is at 12-o'clock (−90°). */
export function rotationForSlot(idx, total) {
  if (!total || total <= 1) return 0;
  const stepDeg = 360 / total;
  // We want the active slot at the top (−90°).
  // Each planet i sits at angle = i * stepDeg − 90.
  // To move planet idx to −90, we rotate the ring by −(idx * stepDeg).
  return -(idx * stepDeg);
}

/** Returns the 0-based index of a planet by id inside an array. */
export function indexOfPlanet(planets, id) {
  if (!planets || !id) return -1;
  return planets.findIndex((p) => p.id === id);
}
