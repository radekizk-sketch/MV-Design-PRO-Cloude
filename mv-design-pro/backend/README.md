# mv-design-pro-backend

## Installation

```bash
poetry install
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
