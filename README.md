# Proyecto Gimnasio

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

Las decisiones y límites están en [docs/architecture.md](docs/architecture.md). El entorno local de PostgreSQL está explicado en [docs/local-database.md](docs/local-database.md). El flujo de ramas y PR está en [docs/github-workflow.md](docs/github-workflow.md), y la matriz de acceso y protección en [docs/github-permissions.md](docs/github-permissions.md).

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
cp .env.example .env
docker compose up -d db
npm run db:generate
npm run dev
```

En PowerShell, reemplazar `cp .env.example .env` por `Copy-Item .env.example .env`. El frontend queda en `http://localhost:5173`, la API en `http://localhost:3000` y PostgreSQL en `localhost:5432`.

Cada integrante trabaja con su propia base local. El esquema común se mantiene mediante `schema.prisma` y las migraciones versionadas; consultar [la guía de base local](docs/local-database.md) antes de modificar el modelo.

## Verificación

```bash
npm run check
```

`package-lock.json` forma parte del repositorio. Usar `npm ci` en CI y para instalaciones locales completamente reproducibles.
