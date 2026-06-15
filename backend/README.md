# Backend — Momentum Road Command Center

## Ejecutar localmente

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

## Tests

Con el backend arrancado:

```bash
pytest -q
```

## Endpoints principales

- `GET /api/`
- `GET /api/cities`
- `GET /api/health`
- `GET /api/events?city=madrid`
- `GET /api/parking?lat=40.4168&lon=-3.7038&radius=1500`
- `GET /api/geocode?q=Plaza Mayor Madrid`
- `GET /api/route?from=Plaza Mayor Madrid&to=Puerta del Sol Madrid&mode=car`
- `GET /api/multimodal/plan?from_lat=40.5&from_lon=-3.8&to_lat=40.4168&to_lon=-3.7038`
- `GET /api/azure/status`
- `GET /api/uber/status`
