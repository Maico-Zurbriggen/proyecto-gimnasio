# Instrucciones del frontend

Estas reglas complementan el `AGENTS.md` raíz para `apps/frontend`.

## Responsabilidad

- Construir una SPA React móvil primero. La sesión activa debe ser plenamente usable a 360 px y con pocos toques.
- Consumir exclusivamente la API pública del backend mediante una capa de cliente; no acceder a PostgreSQL, Prisma, el motor ni proveedores externos.
- Mantener reglas de negocio y autorización en el backend. La UI puede anticipar validaciones, pero la API vuelve a validarlas.
- Usar TanStack Query para estado del servidor. Reservar estado global para necesidades demostradas.
- Consumir contratos desde `@gym/contracts`; no duplicar DTOs a mano.

## Convenciones

- Organizar por feature cuando aparezcan funcionalidades; los componentes compartidos deben ser realmente genéricos.
- Diseñar estados de carga, vacío, error y reintento junto con el camino feliz.
- Cumplir accesibilidad por teclado, etiquetas y contraste. No comunicar información sólo por color.
- Conservar localmente el borrador de la sesión activa; la estrategia de sincronización debe ser explícita y testeada.
- Mantener el SVG muscular inline y controlado por props; no agregar canvas, WebGL ni 3D.

## Verificación

- Ejecutar `npm run lint --workspace=@gym/frontend`, `npm run typecheck --workspace=@gym/frontend`, `npm test --workspace=@gym/frontend` y `npm run build --workspace=@gym/frontend`.
- Agregar pruebas de interacción para flujos y Playwright sólo para recorridos críticos de extremo a extremo.

## Code Review Rules

- Señalar lógica de permisos confiada sólo al cliente.
- Señalar interfaces de sesión que requieran precisión de escritorio o pierdan datos ante una interrupción.
- Señalar DTOs duplicados y estado remoto copiado innecesariamente a stores globales.
