import { z } from 'zod';

import { apiDelete, apiGet, apiPost, apiPut } from './client';

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

/** Tipos de rutina del glosario (D2/§4.5), para selects sin hardcodear. */
export const TRAINING_PURPOSES = trainingPurposeSchema.options;

export type TrainingPurpose = z.infer<typeof trainingPurposeSchema>;

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
  suggestedLoad: z.number().nullable(),
  restSeconds: z.number().int(),
  warmup: z.boolean(),
});

export const routineContentSchema = routineSummarySchema.extend({
  reviewToken: z.string().optional(),
  generationExplanation: z.string().nullable().optional(),
  generationWarnings: z.array(z.string()).optional(),
  generationPrompt: z.string().nullable().default(null),
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
          available: z.boolean().optional(),
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

const templateSetInputSchema = z.object({
  minRepetitions: z.number().int().min(1),
  maxRepetitions: z.number().int().min(1),
  suggestedLoad: z.number().nonnegative().nullable(),
  restSeconds: z.number().int().min(0),
  warmup: z.boolean(),
});

const templateExerciseInputSchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string().optional(),
  note: z.string().max(500).nullable(),
  sets: z.array(templateSetInputSchema),
});

const templateDayInputSchema = z.object({
  name: z.string(),
  exercises: z.array(templateExerciseInputSchema),
});

/** Escritura de una plantilla (RF-019, RF-020): el orden lo da cada arreglo. */
export const writeTemplateSchema = z.object({
  name: z.string(),
  routineType: trainingPurposeSchema,
  days: z.array(templateDayInputSchema),
});

export type WriteTemplate = z.infer<typeof writeTemplateSchema>;

export const routineTemplateDetailSchema = z.object({
  id: z.string(),
  gymId: z.string(),
  authorTrainerId: z.string(),
  name: z.string(),
  routineType: trainingPurposeSchema,
  active: z.boolean(),
  days: z.array(
    z.object({
      position: z.number().int(),
      name: z.string(),
      exercises: z.array(
        z.object({
          position: z.number().int(),
          exerciseId: z.string(),
          exerciseName: z.string().optional(),
          movementPattern: z.string(),
          note: z.string().nullable(),
          sets: z.array(prescribedSetSchema),
        }),
      ),
    }),
  ),
});

export type RoutineTemplateDetail = z.infer<typeof routineTemplateDetailSchema>;

const templateIdSchema = z.object({ templateId: z.string() });
const templateActiveSchema = z.object({
  templateId: z.string(),
  active: z.boolean(),
});

const manualRoutineSchema = z.object({
  routineId: z.string(),
  versionId: z.string(),
  state: z.literal('PROPUESTA'),
});

/** Entrada de rutina manual: tipo y días; sin nombre de plantilla. */
export const writeManualRoutineSchema = writeTemplateSchema.omit({
  name: true,
});

export type WriteManualRoutine = z.infer<typeof writeManualRoutineSchema>;

export function routineTemplatesQueryKey() {
  return ['routine-templates'] as const;
}

export function routineTemplateQueryKey(templateId: string) {
  return [...routineTemplatesQueryKey(), templateId] as const;
}

export function studentRoutinesQueryKey(studentId: string) {
  return ['students', studentId, 'routines'] as const;
}

export function routineContentQueryKey(studentId: string, routineId: string) {
  return [...studentRoutinesQueryKey(studentId), routineId] as const;
}

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

/** `POST /students/:studentId/routines/manual`: rutina manual en PROPUESTA. */
export async function createManualRoutine(
  studentId: string,
  input: WriteManualRoutine,
): Promise<z.infer<typeof manualRoutineSchema>> {
  const body = await apiPost(
    `/students/${encodeURIComponent(studentId)}/routines/manual`,
    input,
  );
  return manualRoutineSchema.parse(body);
}

/** `POST /students/:studentId/routines/:routineId/review`: aprueba o rechaza. */
export async function reviewRoutine(
  studentId: string,
  routineId: string,
  input: { result: ReviewResult; observation?: string; reviewToken?: string },
): Promise<z.infer<typeof reviewedRoutineSchema>> {
  const body = await apiPost(
    `/students/${encodeURIComponent(studentId)}/routines/${encodeURIComponent(routineId)}/review`,
    input,
  );
  return reviewedRoutineSchema.parse(body);
}

/** `GET /routine-templates/:templateId`: detalle editable de la plantilla. */
export async function fetchRoutineTemplate(
  templateId: string,
  signal?: AbortSignal,
): Promise<RoutineTemplateDetail> {
  const body = await apiGet(
    `/routine-templates/${encodeURIComponent(templateId)}`,
    { signal },
  );
  return routineTemplateDetailSchema.parse(body);
}

/** `POST /routine-templates`: crea una plantilla privada del gimnasio. */
export async function createRoutineTemplate(
  input: WriteTemplate,
): Promise<z.infer<typeof templateIdSchema>> {
  const body = await apiPost('/routine-templates', input);
  return templateIdSchema.parse(body);
}

/** `PUT /routine-templates/:templateId`: reemplaza el contenido. */
export async function updateRoutineTemplate(
  templateId: string,
  input: WriteTemplate,
): Promise<z.infer<typeof templateIdSchema>> {
  const body = await apiPut(
    `/routine-templates/${encodeURIComponent(templateId)}`,
    input,
  );
  return templateIdSchema.parse(body);
}

/** `DELETE /routine-templates/:templateId`: desactiva sin borrar. */
export async function deactivateRoutineTemplate(
  templateId: string,
): Promise<z.infer<typeof templateActiveSchema>> {
  const body = await apiDelete(
    `/routine-templates/${encodeURIComponent(templateId)}`,
  );
  return templateActiveSchema.parse(body);
}

/** `POST /routine-templates/:templateId/activate`: reactiva. */
export async function activateRoutineTemplate(
  templateId: string,
): Promise<z.infer<typeof templateActiveSchema>> {
  const body = await apiPost(
    `/routine-templates/${encodeURIComponent(templateId)}/activate`,
    {},
  );
  return templateActiveSchema.parse(body);
}
