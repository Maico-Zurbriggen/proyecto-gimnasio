# Proyecto Gimnasio — Frontend

SPA React de la plataforma de entrenamiento asistido.

## Responsabilidad

- presentar flujos de alumno, entrenador y administrador;
- mantener la sesión activa usable desde 360 px;
- consumir exclusivamente la API REST del backend;
- gestionar estado remoto con TanStack Query;
- seguir generaciones asíncronas mediante polling al backend;
- deshabilitar sólo la generación cuando no esté disponible; los presets son alcance opcional.

Frontend no accede a PostgreSQL, Prisma, servicio IA, ngrok ni LLM. El OpenAPI del backend es la fuente de verdad para tipos y cliente HTTP.

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

## Verificación

```bash
npm run check
```

## Repositorios relacionados

- Backend: `proyecto-gimnasio-back`.
- Servicio IA y analítica: `proyecto-gimnasio-ia`.
- Documentación canónica: [proyecto-gimnasio-documentacion](https://github.com/Maico-Zurbriggen/proyecto-gimnasio-documentacion).

Para trabajo asistido por IA, comenzar por `AGENTS.md` y el `manifest.json` del repositorio documental.
