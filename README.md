# Proyecto Gimnasio — Frontend

SPA web de la plataforma de entrenamiento asistido. Este repositorio contiene únicamente la interfaz React; el backend y el motor analítico viven en repositorios independientes.

## Responsabilidad

- presentar los flujos de alumno, entrenador y administrador;
- mantener la sesión activa usable desde 360 px;
- consumir exclusivamente la API REST publicada por el backend;
- gestionar estado remoto con TanStack Query y estados de interacción locales;
- conservar localmente el borrador de una sesión activa cuando corresponda.

El frontend no accede a PostgreSQL, Prisma, el motor de IA ni proveedores externos. OpenAPI, publicado por el backend, será la fuente de verdad para generar los tipos y el cliente HTTP.

## Requisitos

- Node.js 24 o superior;
- npm 11.6 o superior.

## Inicio local

```bash
npm ci
cp .env.example .env
npm run dev
```

En PowerShell, usar `Copy-Item .env.example .env`. La aplicación queda disponible en `http://localhost:5173` y espera la API en la URL configurada por `VITE_API_URL`.

## Verificación

```bash
npm run check
```

## Repositorios relacionados

- Backend: `proyecto-gimnasio-back`.
- Motor analítico: `proyecto-gimnasio-ia`.
- Documentación canónica: [proyecto-gimnasio-documentacion](https://github.com/Maico-Zurbriggen/proyecto-gimnasio-documentacion).

El corpus funcional y las fronteras del sistema se mantienen exclusivamente en el repositorio documental. Para trabajo asistido por IA, comenzar por su `AGENTS.md` y `manifest.json`.
