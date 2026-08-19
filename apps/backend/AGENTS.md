# Instrucciones del backend

Estas reglas complementan el `AGENTS.md` raíz para `apps/backend`.

## Responsabilidad

- Mantener un único despliegue Node.js con Express y TypeScript, organizado como monolito modular.
- Hacer cumplir invariantes, autorización, transacciones y contratos de la API.
- Separar los módulos por dominio: identidad, catálogo, rutinas, entrenamiento, métricas, seguimiento y administración.
- Evitar imports internos entre módulos. Integrarse mediante interfaces/servicios públicos o eventos en proceso cuando haya una necesidad real.
- Mantener `app.ts` libre del arranque del servidor para poder probar la aplicación con Supertest.
- Usar routers y middleware explícitos; no crear un framework interno ni contenedores de inyección de dependencias.
- Mantener Prisma como detalle de infraestructura; no exponer modelos ORM como respuestas HTTP.

## Dominio y seguridad

- Autorizar en dos pasos: rol y propiedad/asignación del recurso. Probar ambos.
- Usar cookies `httpOnly` para sesión; nunca guardar tokens de autenticación en `localStorage`.
- Aplicar baja lógica donde el historial dependa de una entidad.
- Congelar la prescripción al iniciar una sesión y conservarla junto a los valores reales.
- No modificar migraciones ya aplicadas. Crear una migración nueva y documentar cambios incompatibles.
- Publicar y actualizar OpenAPI con cada cambio de contrato.

## Integraciones

- Encapsular LLM y recomendadores detrás de puertos/adaptadores.
- Aplicar timeout, reintento limitado, caché/límite si corresponde y fallback determinístico.
- Leer el score de riesgo precalculado; no ejecutar entrenamiento ni inferencia Python durante una petición.

## Verificación

- Ejecutar `npm run lint --workspace=@gym/backend`, `npm run typecheck --workspace=@gym/backend`, `npm test --workspace=@gym/backend` y `npm run build --workspace=@gym/backend`.
- Priorizar unit tests para reglas puras, tests de API para autorización y tests de integración para persistencia.

## Code Review Rules

- Señalar routers con lógica de dominio o acceso directo a Prisma.
- Señalar endpoints con identificadores de usuario que no prueben acceso ajeno (403).
- Señalar cambios que reescriban sesiones, series históricas o plantillas ya copiadas.
