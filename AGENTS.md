# Instrucciones del frontend

## Contexto

Este repositorio contiene la SPA React de la plataforma. Backend Express y el servicio Python de IA son repositorios independientes. El servicio IA orquesta de forma asíncrona el LLM alojado en el Polo y también contendrá jobs analíticos batch; frontend no conoce ninguno de esos límites.

La documentación canónica vive en `Maico-Zurbriggen/proyecto-gimnasio-documentacion`. Con repositorios hermanos, leer primero `../proyecto-gimnasio-documentacion/AGENTS.md` y usar `manifest.json`. Si no está disponible localmente, consultar GitHub; no reconstruir reglas por memoria ni copiar documentación aquí.

## Responsabilidad

- Construir una SPA React móvil primero, plenamente usable a 360 px.
- Consumir exclusivamente el OpenAPI público del backend mediante cliente generado.
- No acceder a PostgreSQL, Prisma, IA, ngrok, LLM ni proveedores externos.
- Mantener reglas de negocio y autorización en backend.
- Usar TanStack Query para estado remoto; reservar estado global para necesidades demostradas.
- Conservar localmente el identificador de una generación activa para recuperarla tras recargar.

## Generación asíncrona

- Crear la solicitud en backend y consultar su estado mediante polling; nunca mantener una petición abierta esperando al LLM.
- Detener polling en estados terminales y diseñar carga, reintento, error e indisponibilidad.
- Si generación no está disponible, deshabilitar esa sección sin degradar el resto. Mostrar presets sólo si se implementa su alcance opcional.
- Una salida generativa validada aparece como rutina `PROPUESTA`; nunca presentarla como vigente antes de la aprobación del entrenador.
- No implementar lógica de compatibilidad o permisos sólo en cliente.

## Estructura del código

Organizar el código por feature y crear carpetas sólo cuando exista código real que las justifique:

```text
src/
├── app/
│   ├── router/
│   └── providers/
├── api/
│   ├── generated/
│   └── client.ts
├── features/
│   └── <feature>/
│       ├── api/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       ├── schemas/
│       └── types/
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── types/
├── assets/
├── App.tsx
├── main.tsx
└── styles.css
```

- `app/` compone router, providers y configuración global; no contiene dominio.
- `api/generated/` contiene el cliente generado desde OpenAPI y no se modifica manualmente.
- `api/client.ts` concentra la configuración común del transporte HTTP.
- `features/` contiene las historias verticales; una feature no importa internals de otra.
- `shared/` recibe únicamente código reutilizado por dos o más features, sin reglas de negocio.
- Mantener los tests de componentes, hooks y lógica junto al archivo probado con sufijo `.test.ts` o `.test.tsx`.
- Reservar `test/` para configuración transversal y `e2e/` para los recorridos críticos de Playwright cuando se incorporen.
- No crear todas las carpetas del esquema por anticipado ni archivos barril `index.ts` sin una necesidad concreta.

## Convenciones

- Crear inicialmente features como `auth`, `users`, `exercise-catalog`, `routine-templates`, `routines`, `training-sessions` y `administration` a medida que se implementen.
- Diseñar carga, vacío, error y reintento junto con el camino feliz.
- Cumplir accesibilidad por teclado, etiquetas y contraste; no comunicar sólo por color.
- Conservar localmente el borrador de sesión activa con estrategia de sincronización explícita.
- Mantener el SVG muscular inline y controlado por props; no agregar canvas, WebGL ni 3D.
- Nombrar dominio con `product/glossary.md` del repositorio documental.

## Forma de trabajo

- Crear ramas desde `develop`; todo cambio entra por PR.
- Promover `develop → test → main`; no crear commits exclusivos en `test`.
- Usar Conventional Commits en inglés.
- No agregar dependencias de producción sin justificar su necesidad.
- Actualizar el cliente generado en el mismo PR que adopte un contrato backend nuevo.
- Relacionar PR de código y documental cuando cambie contrato, regla o flujo.

## Verificación

- Ejecutar `npm run check` antes de cerrar una tarea.
- Agregar pruebas de interacción para flujos y Playwright sólo para recorridos E2E críticos.

## Code Review Rules

- Señalar permisos confiados sólo al cliente.
- Señalar interfaces de sesión que pierdan datos ante una interrupción.
- Señalar DTO manuales que deberían provenir de OpenAPI.
- Señalar estado remoto copiado innecesariamente a stores globales.
- Señalar llamadas directas a IA, ngrok o LLM.
