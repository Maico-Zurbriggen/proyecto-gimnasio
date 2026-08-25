# Arquitectura del sistema

## Distribución

El sistema se divide en tres repositorios desplegables de manera independiente:

```text
proyecto-gimnasio (React SPA)
              |
              | REST/JSON + cookie httpOnly
              v
proyecto-gimnasio-back (Express + TypeScript)
              |
              v
         PostgreSQL
              ^
              |
proyecto-gimnasio-ia (Python batch)
```

## Contratos entre repositorios

- El backend es dueño del contrato OpenAPI y de la estructura persistida.
- El frontend genera tipos y cliente a partir de una versión explícita de OpenAPI; no comparte código fuente con el backend.
- El motor no sirve HTTP. Lee vistas o snapshots acordados y escribe resultados precalculados versionados.
- Los cambios incompatibles se coordinan con versionado y PR relacionados en los repositorios afectados.

## Responsabilidad del frontend

- Presentación, accesibilidad y estado de interacción.
- Estado remoto mediante TanStack Query.
- Borrador local de la sesión activa.
- Validaciones de experiencia de usuario que la API vuelve a comprobar.

El frontend nunca accede directamente a PostgreSQL, Prisma, el motor ni proveedores externos.

## Invariantes transversales

1. Una plantilla se copia al solicitar una rutina; los cambios posteriores no reescriben versiones existentes.
2. Al comenzar una sesión se congela lo prescripto junto a lo realmente ejecutado.
3. Historial e indicadores derivados no son fuentes de verdad editables.
4. El entrenador es la puerta de aprobación para poner una rutina en vigencia.
5. El motor guarda versión, fecha y explicación de toda salida precalculada.
6. Cualquier capacidad inteligente tiene una alternativa determinística y nunca convierte su fallo en un 5xx.
