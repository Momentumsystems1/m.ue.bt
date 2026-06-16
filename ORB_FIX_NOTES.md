# ORB DEEP FIX

This build is intentionally functional-first.

What changed:
- RadialCommand rewritten with explicit pointer-events, high z-index and fixed icon centering.
- Orb is draggable from the central circle.
- Navigator panel opens reliably and has origin/destination pick point + text input.
- Layer buttons toggle visible map changes even when Azure tiles fail.
- Traffic / incidents / weather have local fallback overlays so the user sees the action.
- Satellite button changes the whole MapLibre style to satellite.
- Azure backend accepts AZURE_MAPS_KEY, AZURE_MAPS_PRIMARY_KEY or AZURE_SUBSCRIPTION_KEY.

Security:
- Do not commit Azure keys to GitHub.
- Put the regenerated key only in Render backend environment.
