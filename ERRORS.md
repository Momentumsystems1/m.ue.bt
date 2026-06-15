# Errores encontrados y correcciones

## 1. Claves reales en `backend/.env`

El ZIP original contenía claves reales de Azure Maps y Uber. Se han retirado del export saneado.

Acción recomendada: rotar/regenerar esas claves en los paneles correspondientes si el ZIP original ha sido compartido con terceros o subido a servicios externos.

## 2. Tests backend apuntaban al preview remoto de Emergent

Los tests usaban por defecto:

```text
https://pro-transform-2.preview.emergentagent.com
```

Eso fallaba fuera de Emergent por DNS/red. Ahora apuntan por defecto a:

```text
http://127.0.0.1:8001
```

Resultado validado con backend local arrancado:

```text
13 passed in 20.24s
```

## 3. Geocoding podía devolver 404 si Nominatim no respondía

`/api/geocode?q=Plaza Mayor Madrid` fallaba en sandbox cuando Nominatim no resolvía por DNS.

Corrección: fallback local determinista para ubicaciones demo conocidas como Plaza Mayor Madrid, Puerta del Sol, Madrid, Barcelona, Valencia, Sevilla y Bilbao.

## 4. Multimodal plan podía quedarse solo con transporte público

Cuando Azure Maps no respondía, `/api/multimodal/plan` podía devolver solo una opción y sin parkings.

Corrección: fallback de ruta aproximada y fallback de parkings para Madrid Centro. Ahora el endpoint devuelve coche directo, coche+parking+andar, coche+parking+transporte y transporte público incluso sin Azure.

## 5. `REACT_APP_BACKEND_URL` frágil en frontend

Antes, si la variable no existía, el cliente podía construir URLs tipo `undefined/api`.

Corrección: fallback a ruta relativa/same-origin.

## 6. Dependencia Emergent-only

El `package.json` incluía `@emergentbase/visual-edits`, una dependencia externa propia del entorno Emergent.

Corrección: eliminada del `package.json`. El `craco.config.js` ya tiene un `try/catch` que desactiva visual edits si no está instalada.

## 7. Validación frontend pendiente

No se pudo completar `npm install` en el sandbox por timeout de red/instalación. No hay un error de compilación confirmado todavía.

Prueba pendiente en entorno con npm operativo:

```bash
cd frontend
npm install --legacy-peer-deps
npm run build
```

## 8. Scripts/badge/analytics de Emergent en `public/index.html`

El HTML público incluía script externo de Emergent, badge “Made with Emergent” y una clave pública de PostHog.

Corrección: retirados del HTML para dejar una exportación limpia y corporativa.
