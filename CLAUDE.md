# CLAUDE.md

## Qué es

Plataforma web de entrenamiento asistido para gimnasios afiliados, con tres roles: alumno, entrenador y administrador.
La capacidad central es el bucle **rutina prescripta → sesión ejecutada → indicadores → diagnóstico → propuesta de adaptación → revisión del entrenador → versión nueva**.
El sistema **decide** el ajuste y lo fundamenta; el entrenador es la única puerta que lo pone en vigencia.
Ante una decisión ambigua, resolvé en la dirección que conserve el historial ejecutado y que mantenga al entrenador como aprobador.

## Estado del repositorio

Este archivo es **provisional**: el repositorio es un scaffold sin funcionalidades de negocio.
`apps/backend/prisma/schema.prisma` no tiene ningún modelo y no hay migraciones; el dominio entra por migraciones revisadas.
No hay módulos NestJS de dominio: se crean al empezar una historia vertical, nunca como carpetas vacías.
Actualizá la sección **Trampas conocidas** cada vez que algo salga mal por una razón no obvia.

## Comandos

- Entorno local: `npm install` · `python -m venv motor/.venv` · `python -m pip install -e "./motor[dev]"` · `docker compose up -d db` · `npm run dev`.
- Copiá `.env.example` a `.env` antes de levantar nada. Frontend en `:5173`, API en `:3000`.
- Verificación completa antes de cerrar una tarea: `npm run check` (format:check + lint + typecheck + test + build, JS y Python).
- Verificación acotada: `npm run <lint|typecheck|test|build> --workspace=@gym/<backend|frontend|contracts>`.
- Motor: `python -m ruff check motor` · `python -m mypy motor/src` · `python -m pytest motor/tests`.
- Migraciones: `npm exec --workspace=@gym/backend -- prisma migrate dev --name <nombre>` (todavía no hay script de npm; agregalo con la primera migración).
- No cierres una tarea con verificaciones en rojo ni bajes cobertura para que CI pase.

## Fronteras que no se cruzan

- El frontend consume **sólo** la API REST del backend: nunca Prisma, PostgreSQL, el motor ni un proveedor externo.
- El backend es dueño de permisos, transacciones, invariantes y contrato HTTP. La UI puede anticipar validaciones; la API siempre revalida.
- `packages/contracts` contiene DTO y esquemas Zod compartidos, nunca modelos ORM ni lógica de negocio.
- No expongas modelos de Prisma como respuesta HTTP; Prisma es infraestructura del backend.
- Los módulos del backend no se importan entre sí: integrá por servicio/interfaz pública o evento en proceso.
- `motor` no sirve HTTP ni entra en el camino de una petición: lee snapshots y escribe resultados precalculados.
- LLM y recomendadores van detrás de puertos/adaptadores, con timeout, límite por usuario y fallback determinístico.
- PostgreSQL es la única fuente de verdad: no agregues Redis, colas ni otro datastore sin un problema medido.

## Invariantes del dominio

Violarlas produce código que compila, pasa tests superficiales y corrompe datos en silencio.

### Prescripción y ejecución

- Al iniciar una sesión, **copiá** la prescripción del día en los registros de serie de esa sesión. Esa copia es inmutable en todo estado (RN-52, RN-61).
- Nunca modifiques una prescripción congelada, una serie histórica ni una `VersionRutina` SUPERSEDIDA: reescribís el pasado bajo el que se ejecutaron sesiones.
- Solicitar una rutina desde una plantilla hace **copia profunda**, no referencia. Editar la plantilla después no toca ninguna rutina existente (RN-33).
- Aceptar una propuesta genera una **versión nueva**; la anterior se conserva íntegra y las sesiones ya ejecutadas conservan su versión (RN-88, RN-89).
- Ninguna rutina alcanza VIGENTE sin revisión favorable de un entrenador con asignación vigente sobre ese alumno — venga de plantilla, de preset elegido por el alumno o de generación (RN-35, RA-07b).
- Un alumno tiene como máximo una rutina VIGENTE, una PROPUESTA y una sesión EN_CURSO (RI-06, RI-09).
- Una incompatibilidad sobrevenida **marca** el ejercicio en la rutina vigente; nunca lo retira automáticamente. Retirarlo lo decide el entrenador (RN-92).
- Toda sesión referencia la versión de rutina bajo la cual se ejecutó (RI-16).
- Una sesión diferida se imputa a la rutina y versión vigentes **en su fecha de ocurrencia**, aunque hoy estén archivadas (RN-59, CB-15).
- El mismo envío de una serie, identificado por `(sesión, orden)`, produce un único registro (RN-60, RI-10).

### Autorización

- Autorizá en dos pasos y en este orden, en **todo** endpoint: (1) el rol admite la operación; (2) el recurso concreto le pertenece o le está asignado (RA-01).
- Validar sólo el rol y no la propiedad es el bug más caro y más plausible del proyecto: cada operación con identificador de alumno necesita un test que lo rechace con un actor autenticado sin relación (RNF-14).
- Toda consulta filtra por el gimnasio del actor. La única excepción es el catálogo base (RA-02).
- El acceso del entrenador existe si y sólo si hay asignación vigente **en el instante de la consulta**, incluido el histórico que supervisó. No hay acceso residual (RN-19, DD-23).
- Los roles son un **conjunto** (`ALUMNO`, `ENTRENADOR`, `ADMINISTRADOR`), nunca un valor único. Los permisos se unen, no se elevan: tener rol de administrador no da acceso a alumnos no asignados (RA-05).
- El administrador no lee sesiones, mediciones ni condiciones físicas de un alumno concreto (RA-06).
- El alumno nunca ve su propia estimación de riesgo de abandono, en ninguna respuesta ni payload intermedio (DD-17).
- No hay alta espontánea: toda cuenta nace de una invitación vigente, y los roles son exactamente los de la invitación (RN-02a, RN-02c).
- Rechazá el acceso a un recurso ajeno con mensaje genérico que no revele si existe (CB-34).
- Sesión por cookie `httpOnly`; nunca tokens en `localStorage`.

### Datos e indicadores

- Ninguna entidad referenciada por información histórica se borra: baja lógica. La única eliminación real es la anonimización de la baja de cuenta (PD-06, RN-106).
- Las cargas y pesos van en `Decimal` de Prisma sobre `@db.Decimal(8,2)`. **Nunca `number`, `float` ni `double`** para una magnitud en kg.
- Redondeá la carga a 0,01 una sola vez, al ingresar; nunca en cada cálculo (CB-48).
- Almacená los instantes en UTC; derivá día y semana en la **zona horaria del gimnasio**, nunca la del dispositivo ni UTC. Semana de lunes a domingo (RN-110).
- Todo indicador se calcula sobre la **fecha de ocurrencia** de la sesión, nunca sobre el instante de registro (RN-72).
- Derivá volumen, frecuencia, carga máxima estimada, adherencia y cumplimiento. No los persistas (PD-03).
- Persistí sólo eventos fechados y salidas de componentes: récords, diagnósticos, propuestas, estimaciones, y el estado de compatibilidad de `EjercicioRutina` (único derivado persistido).
- Falta de datos **no** es cero: devolvé "no disponible" y declaró qué falta. Nunca cero, vacío ni valor por defecto (RN-73, RNF-09).
- Un ejercicio sin participación muscular declarada está **no clasificado**: no aporta volumen, y esa ausencia se distingue de aportar cero (RN-30).
- El volumen se imputa al ejercicio **ejecutado**; el cumplimiento se evalúa contra el **prescripto** (D4/§2.5).
- Todo registro simulado va marcado y excluido de cualquier analítica presentada como real (RN-107).
- Las enumeraciones de D2/§4 son cerradas: no agregues valores sin modificar D2 primero.

### Componentes inteligentes

- Toda salida de un componente registra versión del componente, contexto de entrada e instante de cálculo, y debe ser reproducible desde eso (RN-98, RNF-27).
- Toda salida de un componente de decisión se valida contra compatibilidad (D5/§6) y contra los rangos del tipo de rutina (RN-39a) **antes** de presentarse. Una salida inválida no se muestra: un reintento y después la vía determinística (RN-95b).
- Un componente narrativo no introduce ningún valor numérico ausente de su entrada. Es la métrica de calidad más barata y contundente del proyecto (RN-94).
- La indisponibilidad de un servicio externo nunca produce 5xx ni error visible: continuá por la alternativa determinística e informá qué no está disponible (RN-99).
- No ejecutes entrenamiento ni inferencia Python dentro de una petición: leé el score precalculado (RN-100, RNF-05).
- En el motor, construí features **point-in-time**: ninguna fila puede usar información posterior al instante predicho. La fuga temporal es indetectable en revisión y falsea todas las métricas.
- Compará todo modelo contra un criterio de referencia simple y conservá ambas métricas. Que gane la regla simple es un resultado admisible y se informa (RN-103).
- Ningún componente emite indicaciones médicas, diagnósticos clínicos ni recomendaciones de tratamiento (RN-96).

## Convenciones

- Nombrá entidades, campos, módulos y valores de enumeración con los términos literales de D2, en español: `SesionEntrenamiento`, `RegistroSerie`, `cargaEjecutada`, `DOMINANTE_RODILLA`. No traduzcas al inglés ni inventes sinónimos.
- Respetá los términos prohibidos de D2/§2: nunca "rutina activa" (es **vigente**), "asignar una rutina" (se _solicita_, se _revisa_, se _pone en vigencia_), "tonelaje", "dieta", ni "cumplimiento" sin calificar.
- Commits, comentarios de código y mensajes de PR en inglés, con Conventional Commits: `type(scope): summary`.
- Validá toda entrada con esquemas Zod de `@gym/contracts`; el frontend no duplica DTO a mano.
- Los rangos admisibles se validan siempre del lado del servidor y el mensaje de rechazo incluye el rango (RN-55, CB-43).
- Actualizá OpenAPI en el mismo PR que cambie un contrato.
- Nunca modifiques una migración ya aplicada: creá una nueva y documentá los cambios incompatibles.
- Nunca incluyas secretos ni datos personales reales; usá `.env.example` y datos sintéticos.
- Priorizá tests unitarios para reglas puras, tests de API para autorización y tests de integración para persistencia. Toda regla de dominio, permiso y corrección de bug lleva test.
- La sesión activa del frontend es móvil primero: usable a 360 px, sin desplazamiento horizontal, y con borrador local que sobrevive a una interrupción (RNF-06, RNF-10).

## Trampas conocidas

- No existe `package-lock.json` y CI corre `npm install`. El PR que lo agregue debe cambiar `.github/workflows/ci.yml` a `npm ci` en el mismo commit.
- `noUncheckedIndexedAccess` está activo: todo acceso indexado devuelve `T | undefined`. No lo silencies con `!`.
- El equipamiento es del **gimnasio**, no del alumno. La falta de equipamiento **impide**, no advierte. El modelo v1.0 tenía una entidad del alumno que ya no existe (PD-07, RN-47).
- La falta de aptitud vigente **nunca** impide una operación: sólo advierte de forma destacada (RN-13, RN-48). El estado de membresía es puramente informativo (RN-14).
- Ausente, vencida y vigente son tres estados distintos de la aptitud y nunca se colapsan en "no tiene" (D6/§10).
- La adherencia pondera semana a semana por la frecuencia objetivo **vigente en esa semana**, y **no se reinicia** al cambiar de rutina (RN-67, RN-68).
- Por encima de 12 repeticiones no se calcula carga máxima estimada; con carga cero el único récord posible es por repeticiones (RN-65, RN-70a).
- Corregir o eliminar una sesión que produjo un récord obliga a recalcular ese récord sobre el histórico completo (RN-71).
- Una sesión que cruza medianoche se imputa a la fecha de inicio en la zona horaria del gimnasio (CB-46).
- Cambiar las constantes de cálculo recalcula los indicadores derivados, pero **no** los diagnósticos, propuestas ni estimaciones ya emitidos (CB-19).
- Un entrenador que entrena necesita **otro** entrenador asignado. No hay autoasignación ni excepción a la puerta (RN-22a).

## Flujo de trabajo

- Todo cambio entra por PR. No hagas push directo a `main` ni a `develop`.
- Ramas desde `develop`: `feature/<issue>-<descripcion>`, `fix/<issue>-<descripcion>`. `hotfix/*` sale de `main` y vuelve a `develop`.
- Hacé cambios pequeños y verticales; no agregues dependencias de producción sin justificar la necesidad en el PR.
- Leé el `AGENTS.md` más cercano antes de tocar `apps/backend`, `apps/frontend` o `motor`.

## Dónde está el resto

Corpus normativo en [docs/](docs/) — no lo transcribas acá, leé el documento cuando lo necesites:

- [D1](docs/D1-vision-y-objetivos.md) visión y capacidad central · [D2](docs/D2-glosario.md) glosario y enumeraciones cerradas · [D3](docs/D3-actores-roles-permisos.md) matriz de permisos y reglas de acceso.
- [D4](docs/D4-modelo-de-dominio.md) entidades, puntos difíciles y restricciones de integridad · [D5](docs/D5-reglas-de-negocio.md) las reglas RN con sus constantes y umbrales.
- [D6](docs/D6-ciclos-de-vida-y-estados.md) estados y **transiciones imposibles** · [D7](docs/D7-flujos-funcionales.md) los 21 flujos con cursos alternativos y de excepción.
- [D8](docs/D8-requerimientos-funcionales.md) requerimientos y prioridades · [D9](docs/D9-requerimientos-no-funcionales.md) criterios de verificación · [D10](docs/D10-casos-borde.md) casos borde: revisalos antes de dar por terminada una funcionalidad.
- [D11](docs/D11-decisiones-de-diseno.md) por qué algo es así, antes de cambiarlo · [D12](docs/D12-riesgos-y-supuestos.md) supuestos abiertos y orden de recorte · [D13](docs/D13-trazabilidad.md) qué quedó sin cubrir.
- [docs/architecture.md](docs/architecture.md) invariantes y fronteras de arquitectura · [docs/github-workflow.md](docs/github-workflow.md) ramas, PR y protección.
- Consultá D5 antes de escribir cualquier umbral, ventana o constante numérica: están todas fijadas ahí y no se configuran (DD-11).
