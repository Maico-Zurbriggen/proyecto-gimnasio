import { z } from 'zod';

import { apiGet, apiPost } from './client';

/**
 * Contrato de los endpoints de prescripción del backend (CAP-4). Escrito a mano
 * hasta que el backend publique OpenAPI.
 */
const trainingPurposeSchema = z.enum([
  'FUERZA',
  'HIPERTROFIA',
  'RESISTENCIA_MUSCULAR',
  'ACONDICIONAMIENTO_GENERAL',
]);

const routineStateSchema = z.enum([
  'PROPUESTA',
  'BLOQUEADA',
  'VIGENTE',
  'RECHAZADA',
  'DESCARTADA',
  'ARCHIVADA',
]);

export const routineTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  routineType: trainingPurposeSchema,
  dayCount: z.number().int(),
  exerciseCount: z.number().int(),
});

export const routineSummarySchema = z.object({
  id: z.string(),
  studentId: z.string(),
  routineType: trainingPurposeSchema,
  state: routineStateSchema,
  origin: z.string(),
  targetWeeklyFrequency: z.number().int(),
  requestedAt: z.string(),
  versionId: z.string(),
  versionNumber: z.number().int(),
});

const prescribedSetSchema = z.object({
  position: z.number().int(),
  minRepetitions: z.number().int(),
  maxRepetitions: z.number().int(),
  suggestedLoad: z.number(),
  restSeconds: z.number().int(),
  warmup: z.boolean(),
});

export const routineContentSchema = routineSummarySchema.extend({
  days: z.array(
    z.object({
      position: z.number().int(),
      name: z.string(),
      dominantPattern: z.string(),
      exercises: z.array(
        z.object({
          position: z.number().int(),
          exerciseId: z.string(),
          exerciseName: z.string(),
          movementPattern: z.string(),
          note: z.string().nullable(),
          sets: z.array(prescribedSetSchema),
        }),
      ),
    }),
  ),
});

const assignedRoutineSchema = z.object({
  routineId: z.string(),
  versionId: z.string(),
  state: z.literal('PROPUESTA'),
});

const reviewedRoutineSchema = z.object({
  routineId: z.string(),
  state: z.enum(['VIGENTE', 'RECHAZADA']),
  archivedRoutineId: z.string().nullable(),
});

export type RoutineTemplate = z.infer<typeof routineTemplateSchema>;
export type RoutineSummary = z.infer<typeof routineSummarySchema>;
export type RoutineContent = z.infer<typeof routineContentSchema>;
export type PrescribedSet = z.infer<typeof prescribedSetSchema>;
export type ReviewResult = 'APROBADA' | 'APROBADA_CON_CAMBIOS' | 'RECHAZADA';

/** `GET /routine-templates`: plantillas asignables del gimnasio. */
export async function fetchRoutineTemplates(
  signal?: AbortSignal,
): Promise<RoutineTemplate[]> {
  const body = await apiGet('/routine-templates', { signal });
  return z.array(routineTemplateSchema).parse(body);
}

/** `GET /students/:studentId/routines`: rutinas del alumno. */
export async function fetchStudentRoutines(
  studentId: string,
  signal?: AbortSignal,
): Promise<RoutineSummary[]> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/routines`,
    { signal },
  );
  return z.array(routineSummarySchema).parse(body);
}

/** `GET /students/:studentId/routines/:routineId`: días, ejercicios y series. */
export async function fetchRoutineContent(
  studentId: string,
  routineId: string,
  signal?: AbortSignal,
): Promise<RoutineContent> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/routines/${encodeURIComponent(routineId)}`,
    { signal },
  );
  return routineContentSchema.parse(body);
}

/** `POST /students/:studentId/routines`: copia la plantilla como PROPUESTA. */
export async function assignRoutineFromTemplate(
  studentId: string,
  templateId: string,
): Promise<z.infer<typeof assignedRoutineSchema>> {
  const body = await apiPost(
    `/students/${encodeURIComponent(studentId)}/routines`,
    { templateId },
  );
  return assignedRoutineSchema.parse(body);
}

/** `POST /students/:studentId/routines/:routineId/review`: aprueba o rechaza. */
export async function reviewRoutine(
  studentId: string,
  routineId: string,
  input: { result: ReviewResult; observation?: string },
): Promise<z.infer<typeof reviewedRoutineSchema>> {
  const body = await apiPost(
    `/students/${encodeURIComponent(studentId)}/routines/${encodeURIComponent(routineId)}/review`,
    input,
  );
  return reviewedRoutineSchema.parse(body);
}
