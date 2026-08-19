# Motor analítico

Paquete Python reservado para los procesos batch de análisis y machine learning. En esta base sólo se define su interfaz operativa; aún no contiene modelos ni lógica de negocio.

## Desarrollo

```bash
python -m venv .venv
python -m pip install -e ".[dev]"
python -m ruff check .
python -m mypy src
python -m pytest
```

El motor se ejecutará programado o bajo demanda, leerá PostgreSQL y escribirá resultados precalculados. No debe convertirse en una dependencia online de la API.
