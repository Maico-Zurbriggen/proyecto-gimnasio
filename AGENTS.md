# Instrucciones del frontend

## Contexto

Este repositorio contiene la SPA React de la plataforma de entrenamiento asistido. El backend Express y el motor batch Python son repositorios independientes. Antes de implementar una historia, consultar el documento funcional correspondiente en `docs/`.

## Responsabilidad

- Construir una SPA React móvil primero. La sesión activa debe ser plenamente usable a 360 px y con pocos toques.
- Consumir exclusivamente la API pública del backend mediante una capa de cliente.
- No acceder a PostgreSQL, Prisma, el motor analítico ni proveedores externos.
- Mantener reglas de negocio y autorización en el backend. La UI puede anticipar validaciones, pero la API vuelve a validarlas.
- Usar TanStack Query para estado del servidor. Reservar estado global para necesidades demostradas.
- Generar tipos y cliente desde OpenAPI cuando el contrato exista; no duplicar DTO manualmente.

## Convenciones

- Organizar por feature cuando aparezcan funcionalidades; los componentes compartidos deben ser realmente genéricos.
- Diseñar estados de carga, vacío, error y reintento junto con el camino feliz.
- Cumplir accesibilidad por teclado, etiquetas y contraste. No comunicar información sólo por color.
- Conservar localmente el borrador de la sesión activa; la estrategia de sincronización debe ser explícita y testeada.
- Mantener el SVG muscular inline y controlado por props; no agregar canvas, WebGL ni 3D.
- Nombrar conceptos de dominio con los términos literales de `docs/D2-glosario.md`.

## Forma de trabajo

- Crear ramas desde `develop`; todo cambio entra por pull request.
- Usar Conventional Commits en inglés: `type(scope): summary`.
- No agregar dependencias de producción sin justificar su necesidad en el PR.
- Actualizar el cliente generado en el mismo PR que adopte una nueva versión del contrato OpenAPI.

## Verificación

- Ejecutar `npm run check` antes de cerrar una tarea.
- Agregar pruebas de interacción para flujos y Playwright sólo para recorridos críticos de extremo a extremo.

## Code Review Rules

- Señalar lógica de permisos confiada sólo al cliente.
- Señalar interfaces de sesión que requieran precisión de escritorio o pierdan datos ante una interrupción.
- Señalar DTO duplicados o tipos escritos a mano que deberían provenir de OpenAPI.
- Señalar estado remoto copiado innecesariamente a stores globales.
