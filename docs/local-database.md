# Base de datos local

## Estrategia

Cada integrante ejecuta una instancia propia de PostgreSQL 17 mediante Docker. No se comparte una base de desarrollo entre el equipo:

- los datos y pruebas de una persona no afectan a las demás;
- todos usan la misma versión de PostgreSQL;
- el esquema se sincroniza mediante Prisma y migraciones versionadas en Git;
- los datos de demostración serán sintéticos y reproducibles mediante un seed.

El volumen `postgres_data` de `compose.yaml` conserva los datos aunque el contenedor se detenga.

## Primera configuración

Desde la raíz del repositorio:

```bash
npm ci
cp .env.example .env
docker compose up -d db
npm run db:generate
npm run db:status
```

En PowerShell:

```powershell
Copy-Item .env.example .env
```

La URL local configurada es:

```text
postgresql://gym:gym@localhost:5432/gym
```

Estas credenciales son únicamente para desarrollo local. No deben reutilizarse en staging ni producción.

## Trabajo cotidiano

Levantar PostgreSQL y ejecutar las aplicaciones localmente:

```bash
docker compose up -d db
npm run dev
```

Detener PostgreSQL sin borrar los datos:

```bash
docker compose stop db
```

Inspeccionar los datos desde el navegador:

```bash
npm run db:studio
```

## Cambios de esquema

Una sola persona crea la migración asociada a una historia:

1. Modificar `apps/backend/prisma/schema.prisma`.
2. Crear y aplicar la migración local:

   ```bash
   npm run db:migrate -- --name nombre_descriptivo
   ```

3. Revisar el SQL generado.
4. Subir en el mismo PR el cambio de `schema.prisma` y la nueva carpeta de `prisma/migrations`.

El resto del equipo, después de actualizar su rama, aplica las migraciones existentes:

```bash
npm run db:deploy
npm run db:generate
```

No editar una migración que ya fue integrada. Si el modelo necesita otra corrección, crear una migración nueva.

## Reinicio local

Si una base local descartable queda inconsistente, puede eliminarse junto con su volumen y recrearse:

```bash
docker compose down -v
docker compose up -d db
npm run db:deploy
```

`docker compose down -v` elimina definitivamente todos los datos locales de este proyecto. No usarlo contra un entorno compartido.

## Staging y producción

Staging y producción deben usar instancias PostgreSQL administradas y separadas. La URL se guarda como secreto `DATABASE_URL` en el proveedor, nunca en Git. El despliegue ejecuta `npm run db:deploy`; no ejecuta `prisma migrate dev` ni modifica migraciones existentes.
