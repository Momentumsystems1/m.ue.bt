# Seguridad

Este proyecto no debe publicar archivos `.env` con claves reales.

## Recomendado ahora

1. Regenerar/rotar las claves de Azure Maps y Uber si el ZIP original salió de tu entorno privado.
2. Configurar claves reales únicamente como variables de entorno en el hosting/backend.
3. Mantener en GitHub solo `.env.example`.
4. No exponer `AZURE_MAPS_KEY`, `UBER_CLIENT_SECRET` ni cualquier token en frontend.

El diseño actual mantiene Azure y Uber detrás del backend FastAPI.
