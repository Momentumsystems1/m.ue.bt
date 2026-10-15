# ROAD COMMAND CENTER — GEM / Amstrad PC1512 · Investor demo

Demo estática para GitHub Pages. Inspirada específicamente en **GEM Desktop 2.0 / Amstrad PC1512 (1986)**: menús Desk/File/View/Options, ventanas rectangulares en mosaico, contornos y controles 2D, escritorio claro y visualización de 16 colores. No es una emulación de hardware.

## Abrir

Local: `python -m http.server 8765` en esta carpeta; abrir `http://localhost:8765`.

GitHub Pages: subir `index.html`, `style.css`, `app.js`, `.nojekyll` en raíz del repositorio o rama destinada a Pages. Configurar Settings → Pages → Deploy from a branch → `main` o rama correspondiente `/ (root)`.

## Módulos y evidencia

| Función | Origen | Estado / límites |
|---|---|---|
| Cartografía | OpenFreeMap/OSM via MapLibre | Mapa real público, requiere Internet/CDN |
| Google Maps | Maps JavaScript API opcional | Clave de navegador restringida a origen autorizado, no se guarda |
| Rutas y paradas | OSRM demo sobre OSM | Rutas reales sobre carreteras, cálculo sin tráfico; servicio público sin SLA |
| Navegación guiada | Enlace Google Maps Directions | Abre navegador/app externo con waypoints, no giro a giro nativo |
| POI gasolina, EV, parking, hospitales | OpenStreetMap / Overpass | Datos OSM reales, pueden no ser completos o actuales. Si el servidor no responde, no se inventan datos. |
| Tiempo/ráfagas/AQI | Open-Meteo + Open-Meteo Air Quality | Modelos/estimaciones meteorológicos y de calidad de aire, no sensores propios; verificar licencias para uso comercial |
| Incidencias y capa de flujo TomTom | TomTom Traffic API opcional | Requiere clave válida y autorización de uso navegador. No se muestran incidencias ficticias como reales. |
| Tráfico Google | Google Traffic Layer opcional | Requiere Google Maps activo con clave. No usar datos Google en mapa no-Google. |
| Dos participantes reales | PeerJS/WebRTC (señalización pública) | Participantes abren invitación HTTPS y autorizan GPS; conexiones en tiempo real peer-to-peer, sin backend persistente. No usar en producción ni seguridad crítica. |
| Convoy | Animación de 2 vehículos sobre la ruta | **SIMULADO**. No GPS de vehículos reales. |
| Quedada | Punto seleccionado + enlace Google Maps | Coordenadas reales del punto seleccionado y vínculo directo. |
| Monitorizar dirección | Nominatim / OSM | Geocodificación (uso esporádico), ordena incidencias alrededor del punto; sin vigilancia de cámaras o personas sin autorización. |

### Credenciales

No incluir tokens de TomTom o Google en repositorios. En la demo, se introducen manualmente en `PROVEEDORES / API` y permanecen solo en memoria de la página; aun así **las claves de navegador son visibles en solicitudes de red**, deben estar restringidas por dominio y API, con cuotas. Las claves de servidor confidenciales deben pasar por backend seguro (no GitHub Pages).

### Privacidad: círculo real

1. Abrir esta demo en HTTPS.
2. Pulsar **Crear círculo** → **Invitar** y enviar el enlace individualmente a máximo dos personas de confianza.
3. Cada participante acepta explícitamente la geolocalización; la página muestra el estado y permite detenerla.
4. No se mantiene historial y se detiene al cerrar la pestaña, pero PeerJS usa señalización externa sin garantía de disponibilidad ni seguridad de misión crítica. Convoy permanece separado y marcado `SIMULADO`.

### Presentación recomendada (8 min)

1. Mostrar GEM/PC1512, seleccionar ciudad e identificar fuentes reales vs demo.
2. Buscar dirección, clic en origen y destino, calcular ruta OSRM.
3. Activar capas gasolina/EV y añadir paradas, recalcular.
4. Mostrar viento, ráfagas previstas y AQI.
5. Conectar clave TomTom restringida: tráfico/incident details en área visible; **si no hay clave, no afirmar que hay incidentes en directo**.
6. Crear una quedada con clic derecho; copiar enlace.
7. Crear círculo y compartir invitaciones para 2 personas consentidas, o mostrar conexión pendiente.
8. Activar convoy simulado y mostrar etiquetas `D1`, `D2` con rutas.

Datos externos sujetos a disponibilidad, límites de uso, CORS y licencias de sus proveedores. Se recomienda contratar proveedor propio y backend privado para el piloto.