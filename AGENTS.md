# Instrucciones del repositorio

## Producto y alcance

Este monorepo implementa una plataforma web de entrenamiento asistido. Su núcleo es el bucle: rutina prescripta → sesión ejecutada → datos → métricas/señales → ajuste del entrenador.

- Preservar siempre la diferencia entre lo planificado y lo ejecutado. Una sesión congela la prescripción; editar una rutina nunca reescribe el historial.
- Los roles son un conjunto (`ALUMNO`, `ENTRENADOR`, `ADMIN`), no un enum exclusivo.
- La autorización combina rol y propiedad/asignación del recurso.
- El alumno puede usar el sistema sin entrenador.
- El score de abandono no se muestra al alumno.
- Quedan fuera del MVP: nutrición prescriptiva, chat en tiempo real, pagos, check-in, video propio, wearables, 3D y aplicación nativa.

## Arquitectura

- `apps/frontend`: SPA React, TypeScript y Vite; móvil primero para la sesión activa.
- `apps/backend`: monolito modular NestJS; una API REST y una base PostgreSQL.
- `motor`: jobs Python batch para análisis/ML; no es un microservicio online.
- `packages/contracts`: contratos compartidos de API. No compartir lógica de negocio entre capas.
- `docs`: decisiones de arquitectura y proceso.

El frontend nunca accede directamente a la base ni al motor. El motor lee datos y escribe resultados precalculados versionados. Los proveedores externos se aíslan detrás de adaptadores con timeout, límite y fallback determinístico.

## Forma de trabajo

- Leer el `AGENTS.md` más cercano antes de modificar una parte del sistema.
- Hacer cambios pequeños y verticales; evitar dependencias entre módulos que no estén justificadas.
- No agregar una dependencia de producción sin explicar su necesidad en el PR.
- Mantener migraciones versionadas y actualizar OpenAPI cuando cambie un contrato.
- Nunca incluir secretos ni datos personales reales. Usar `.env.example` y datos sintéticos.
- Los commits siguen Conventional Commits y se redactan en inglés: `type(scope): summary`.
- Todo cambio entra por PR; no hacer push directo a `main` ni a `develop`.

## Validación

- JavaScript/TypeScript: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Python: `python -m ruff check motor`, `python -m mypy motor/src`, `python -m pytest motor/tests`.
- Antes de cerrar una tarea, ejecutar las verificaciones afectadas. No ocultar fallos ni bajar cobertura para hacer pasar CI.

## Code Review Rules

- Bloquear cambios que mezclen prescripción y ejecución o muten datos históricos.
- Bloquear endpoints que validen RBAC pero no propiedad/asignación.
- Bloquear llamadas directas del frontend al motor, la base o proveedores de IA.
- Exigir tests para reglas de dominio, permisos y correcciones de bugs.
- Señalar consultas analíticas con riesgo de fuga temporal o datos posteriores al evento evaluado.
