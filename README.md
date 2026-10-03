# Proyecto Gimnasio — Frontend

SPA React de la plataforma de entrenamiento asistido.

## Responsabilidad

- presentar flujos de alumno, entrenador y administrador;
- mantener la sesión activa usable desde 360 px;
- consumir exclusivamente la API REST del backend;
- gestionar estado remoto con TanStack Query;
- seguir generaciones asíncronas mediante polling al backend;
- solicitar al backend la finalización explícita de una generación completa para crear la rutina `PROPUESTA`;
- mostrar en `/alumno/rutina` la rutina vigente y la pendiente de revisión, con sus días, ejercicios y series;
- deshabilitar sólo la generación cuando no esté disponible; los presets son alcance opcional.

Frontend no accede a PostgreSQL, Prisma, servicio IA, Cloudflare Tunnel ni LLM. El OpenAPI del backend es la fuente de verdad para tipos y cliente HTTP.

## Requisitos

- Node.js 24 o superior;
- npm 11.6 o superior.

## Inicio local

```bash
npm ci
cp .env.example .env
npm run dev
```

En PowerShell, usar `Copy-Item .env.example .env`. La aplicación queda en `http://localhost:5173` y espera el backend configurado por `VITE_API_URL`.

La aplicación autentica mediante la cookie `httpOnly` emitida por el backend. No se configuran UUID ni roles en variables del frontend: iniciar sesión determina las áreas disponibles, y sólo los usuarios multirrol pueden alternar entre más de una.

Al terminar una generación, **Ver rutina** abre `/alumno/rutina`. La propuesta se muestra con el aviso de revisión pendiente; la puesta en vigencia sigue requiriendo la aprobación del entrenador. Si ya existe una propuesta al solicitar o finalizar una generación, el panel ofrece **Ver rutina pendiente de revisión**.

En desarrollo, **Regenerar** permite editar las indicaciones y enviar otra solicitud con una clave nueva. Requiere la capacidad de pruebas locales del backend. La nueva propuesta reemplaza la pendiente sólo si termina y supera las validaciones; el botón no aparece en la compilación de producción.

Resumen y Mi rutina consultan las mismas rutinas del backend. El resumen muestra una vista previa real, y Mi rutina conserva el seguimiento generativo para finalizar y mostrar la propuesta nueva aunque se cambie de pantalla durante la generación.

## Estructura del código

El frontend se organiza por feature:

```text
src/
├── app/                 # Router y providers globales
├── api/
│   ├── generated/       # Cliente generado desde OpenAPI
│   └── client.ts        # Configuración HTTP
├── features/            # Flujos verticales del producto
│   └── <feature>/
│       ├── api/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       ├── schemas/
│       └── types/
├── shared/              # Código usado por varias features
├── assets/
├── App.tsx
└── main.tsx
```

Las carpetas se crean cuando aparece la primera implementación que las necesita. Los tests unitarios y de interacción se mantienen junto al código probado; `e2e/` queda reservado para recorridos críticos de Playwright. Las reglas completas están en `AGENTS.md`.

## Verificación

Resumen y Mi rutina muestran el **Prompt solicitado** guardado con cada generación. La pantalla presenta el motivo concreto cuando el catálogo compatible no permite cumplir las cantidades pedidas.

```bash
npm run check
```

## Repositorios relacionados

- Backend: `proyecto-gimnasio-back`.
- Servicio IA y analítica: `proyecto-gimnasio-ia`.
- Documentación canónica: [proyecto-gimnasio-documentacion](https://github.com/Maico-Zurbriggen/proyecto-gimnasio-documentacion).

Para trabajo asistido por IA, comenzar por `AGENTS.md` y el `manifest.json` del repositorio documental.
