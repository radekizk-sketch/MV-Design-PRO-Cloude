# mv-design-pro-backend

## Installation

```bash
python3 --version  # wymagane: 3.11+
poetry install --with dev
```

## Tests

```bash
poetry run pytest -q
```

PDF report tests require `reportlab` (included in dev dependencies).

## Run API

```bash
poetry run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

## Powtarzalny start lokalny

```bash
# 1) instalacja zaleznosci backend + testowych (pydantic, pytest, itd.)
poetry install --with dev

# 2) test sanity środowiska
poetry run python -c "import pydantic, fastapi; print('OK')"

# 3) uruchomienie API
poetry run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

# 4) testy backend
poetry run pytest -q

# 5) testy E2E backend (ścieżka krytyczna ENM V1)
poetry run pytest -q tests/e2e/ tests/enm/test_golden_network_v1_e2e.py
```

Jeżeli uruchamiasz testy bez `poetry run`, zależności z lockfile mogą nie być widoczne i testy przerwą się błędem `ModuleNotFoundError`.
