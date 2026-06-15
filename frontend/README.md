# Frontend — Momentum Road Command Center

React + CRACO + Tailwind + MapLibre.

## Ejecutar localmente

```bash
npm install --legacy-peer-deps
npm run start
```

Por defecto espera el backend en:

```text
http://localhost:8001
```

Cambia `REACT_APP_BACKEND_URL` en `.env` o en variables de entorno del hosting.

## Build

```bash
npm run build
```

## Nota

El proyecto venía de Emergent con una dependencia visual propia. Se ha eliminado del `package.json` para que el proyecto sea portable. `craco.config.js` ya ignora esa integración si no está instalada.
