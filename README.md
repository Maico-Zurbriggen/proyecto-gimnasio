# Proyecto Gimnasio

Base de un monorepo para una plataforma web de entrenamiento asistido. No contiene funcionalidades de negocio todavía; incluye el esqueleto de frontend, backend, contratos, motor analítico y automatización.

## Arquitectura

```text
apps/frontend ──REST/JSON──> apps/backend ──> PostgreSQL
                              ^                 ^
                              |                 |
                        contracts         motor (batch)
```

- Frontend: React + Vite + TypeScript.
- Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL, como monolito modular.
- Motor: Python + pandas + scikit-learn, ejecutado por lote.
- Contratos: paquete TypeScript compartido para esquemas de entrada/salida.

Las decisiones y límites están en [docs/architecture.md](docs/architecture.md). El flujo de ramas y PR está en [docs/github-workflow.md](docs/github-workflow.md), y la matriz de acceso y protección en [docs/github-permissions.md](docs/github-permissions.md).

## Requisitos

- Node.js 24 o superior.
- npm 11.6.2.
- Python 3.13.
- Docker Desktop para PostgreSQL y el entorno en contenedores.

## Inicio local

```bash
npm install
python -m venv motor/.venv
# Activar el entorno virtual según el sistema operativo
python -m pip install -e "./motor[dev]"
docker compose up -d db
npm run dev
```

Copiar `.env.example` a `.env` antes de iniciar. El frontend queda en `http://localhost:5173` y la API en `http://localhost:3000`.

## Verificación

```bash
npm run check
```

`package-lock.json` forma parte del repositorio. Usar `npm ci` en CI y para instalaciones locales completamente reproducibles.
