# Momentum Road Command Center

Proyecto exportado de Emergent y preparado para poder continuarse fuera de Emergent.

## Estructura

```text
backend/   FastAPI API: tráfico, eventos, geocoding, rutas, Azure proxy, movilidad multimodal
frontend/  React + CRACO + Tailwind + MapLibre command center UI
memory/    PRD y notas funcionales del proyecto
```

## Arranque rápido local

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env        # opcional; añade claves reales solo en local privado
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

API local: `http://127.0.0.1:8001/api/`

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run start
```

Frontend local: `http://localhost:3000`

`frontend/.env` ya apunta a `http://localhost:8001`. Para producción, define `REACT_APP_BACKEND_URL` con la URL pública del backend.

## Tests backend

Con el backend arrancado en `127.0.0.1:8001`:

```bash
cd backend
pytest -q
```

Validado en esta revisión: **13 tests pasados**.

## Variables de entorno

No se deben subir claves reales al repositorio. Usa:

- `backend/.env.example`
- `frontend/.env.example`

Claves opcionales:

- `AZURE_MAPS_KEY`: activa tráfico, rutas, weather, incidentes y tiles Azure.
- `UBER_CLIENT_ID` / `UBER_CLIENT_SECRET`: activa modo live de Uber. Sin ellas, devuelve estimaciones.

## Cambios aplicados en esta versión saneada

- Eliminadas claves reales del export.
- Añadidos `.env.example` y `.gitignore` raíz.
- Tests backend cambiados para apuntar a local por defecto.
- Backend con fallbacks deterministas para geocoding, rutas y parkings cuando fallan APIs externas.
- Frontend con `REACT_APP_BACKEND_URL` más robusto si falta variable de entorno.
- Añadido CSS oficial de MapLibre en el entrypoint.
- Frontend ajustado a React 18.2 para evitar conflictos frecuentes de peer dependencies con CRA/react-scripts.
- Eliminada dependencia Emergent-only `@emergentbase/visual-edits` del `package.json` para que el proyecto sea portable.

## Estado actual

Backend local probado. Frontend no ha podido validarse con build completo en este sandbox porque `npm install` no terminó por limitación de red/tiempo del entorno, no por un error de código confirmado. En una máquina con acceso normal a npm debe probarse con:

```bash
cd frontend
npm install --legacy-peer-deps
npm run build
```


## Versión completa integrada - 2026-06-15

Esta entrega completa incorpora:
- Flujo lógico del orbe: Log in / Sign up / Visitor Demo, nombre y localización.
- Orbe con geometría orbital matemática y estética crystal liquid.
- Mapa claro con zoom más cercano y fallbacks de render.
- Panel inferior de sistemas conectados con Retry.
- Dependencias frontend ajustadas: date-fns 3.6.0, ajv 8.12.0 y ajv-keywords 5.1.0.

Para subir a GitHub, sube el contenido de este ZIP completo desde la raíz, sustituyendo las carpetas existentes `backend`, `frontend`, `memory` y los archivos raíz.
