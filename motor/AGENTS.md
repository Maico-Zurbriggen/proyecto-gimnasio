# Instrucciones del motor analítico

Estas reglas complementan el `AGENTS.md` raíz para `motor`.

## Responsabilidad

- Implementar jobs Python reproducibles para features, entrenamiento, evaluación y scoring batch.
- No exponer una API HTTP ni entrar en el camino de una petición del usuario.
- Leer snapshots o consultas explícitas de PostgreSQL y escribir resultados precalculados con `model_version`, fecha y metadatos de evaluación.
- Mantener separadas extracción, transformación, entrenamiento, evaluación y persistencia.

## Integridad analítica

- Construir features point-in-time: ninguna fila puede usar información posterior al instante predicho.
- Separar train/validation/test por tiempo o por usuario según el caso; documentar la elección.
- Comparar todo modelo contra un baseline simple. Preferir una regla cuando el modelo no aporte una mejora medible.
- Fijar seeds, versiones, parámetros y artefactos necesarios para reproducir resultados.
- No usar datos personales reales ni subir datasets sensibles, modelos grandes o notebooks con salidas privadas.
- Los notebooks son exploratorios; la lógica aceptada debe migrar a módulos y tests.

## Calidad

- Usar type hints en APIs internas y funciones pequeñas con entradas/salidas explícitas.
- Probar transformaciones, límites temporales, valores faltantes y persistencia idempotente.
- Ejecutar `python -m ruff check motor`, `python -m mypy motor/src` y `python -m pytest motor/tests`.

## Code Review Rules

- Bloquear fuga temporal, métricas calculadas sobre el mismo conjunto usado para entrenar o splits no reproducibles.
- Bloquear scores sin versión de modelo y fecha de cálculo.
- Bloquear inferencia online o acoplamiento directo del frontend con Python.
