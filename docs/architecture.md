# Arquitectura base

## Decisión

Se adopta un monolito modular con una SPA separada y un proceso analítico batch. Es una sola aplicación backend y una sola base; `motor` está aislado por lenguaje y responsabilidad, no para convertirlo en un servicio de red.

```text
React SPA
   |
   | REST/JSON + cookie httpOnly
   v
NestJS API
   |-- identidad
   |-- catálogo
   |-- rutinas
   |-- entrenamiento
   |-- métricas
   |-- seguimiento
   `-- administración
   |
PostgreSQL <---- Python batch (features, entrenamiento y scoring)
```

## Invariantes

1. Una plantilla se copia al asignarse; los cambios posteriores no se propagan silenciosamente.
2. Al comenzar una sesión se congela lo prescripto junto a lo realmente ejecutado.
3. Historial y progreso se derivan; no son fuentes de verdad editables.
4. Un alumno posee como máximo una rutina activa; las anteriores se archivan.
5. El motor calcula scores fuera del request y guarda versión, fecha y explicación del resultado.
6. Cualquier capacidad de IA tiene una alternativa determinística y nunca convierte su fallo en un 5xx.

## Fronteras

- La UI contiene presentación y estado de interacción, no reglas de negocio.
- El backend es dueño de permisos, transacciones, invariantes y contrato HTTP.
- `packages/contracts` contiene DTO/esquemas compartidos, no entidades ORM.
- `motor` no sirve HTTP. Sólo consume snapshots/consultas definidas y persiste resultados precalculados.
- PostgreSQL es la fuente de verdad. No se agrega Redis, colas ni otro datastore sin un problema medido.

## Módulos iniciales previstos

Los módulos se crearán al comenzar historias verticales, no como carpetas vacías: identidad, catálogo, rutinas, entrenamiento, métricas, seguimiento y administración. Las integraciones inteligentes serán adaptadores dentro del backend; el riesgo de abandono será un resultado batch.

## Decisiones pendientes antes de funcionalidades

- Confirmar que la mayoría del equipo trabajará con TypeScript; si predomina Java, reevaluar el backend antes del primer módulo.
- Definir hosting y entornos.
- Congelar el primer contrato OpenAPI y modelo de datos durante el Hito 0/semana 3.
- Confirmar requisitos obligatorios de la cátedra y disponibilidad de un gimnasio real.
