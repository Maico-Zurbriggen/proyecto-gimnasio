import { z } from 'zod';

import { apiGet } from './client';

const actorSchema = z.object({ id: z.string(), name: z.string() }).nullable();

const eventTypeSchema = z.enum([
  'ASIGNADA_DESDE_PLANTILLA',
  'GENERACION_SOLICITADA',
  'CAMBIO_SOLICITADO',
  'REGENERACION_ENTRENADOR',
  'RENOVACION_AUTOMATICA',
  'PROPUESTA_GENERADA',
  'REVISION_ENTRENADOR',
  'CAMBIO_DE_ESTADO',
]);

const routineHistoryEventSchema = z.object({
  type: eventTypeSchema,
  at: z.string(),
  actor: actorSchema,
  detail: z.string().nullable(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const routineHistoryGenerationSchema = z.object({
  requestId: z.string(),
  kind: z.string(),
  freeText: z.string().nullable(),
  parameters: z
    .object({
      objective: z.string(),
      weeklyFrequency: z.number(),
      durationMinutes: z.number(),
      restrictions: z.array(z.string()),
    })
    .nullable(),
  changeRequest: z.string().nullable(),
  trainerFeedback: z.string().nullable(),
  explanation: z.string().nullable(),
  attempts: z.number(),
  modelVersion: z.string().nullable(),
  requestedAt: z.string(),
  finishedAt: z.string().nullable(),
});

const routineHistoryItemSchema = z.object({
  routineId: z.string(),
  state: z.string(),
  origin: z.string(),
  routineType: z.string(),
  targetWeeklyFrequency: z.number(),
  requestedAt: z.string(),
  requestedBy: actorSchema,
  replacesRoutineId: z.string().nullable(),
  replacedByRoutineId: z.string().nullable(),
  versionCount: z.number(),
  generation: routineHistoryGenerationSchema.nullable(),
  events: z.array(routineHistoryEventSchema),
});

const routineHistorySchema = z.object({
  items: z.array(routineHistoryItemSchema),
});

export type RoutineHistoryEvent = z.infer<typeof routineHistoryEventSchema>;
export type RoutineHistoryItem = z.infer<typeof routineHistoryItemSchema>;

/** Trazabilidad de todas las rutinas del alumno, de la más nueva a la más vieja. */
export async function fetchRoutineHistory(
  studentId: string,
  signal?: AbortSignal,
): Promise<RoutineHistoryItem[]> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/routine-history`,
    { signal },
  );
  return routineHistorySchema.parse(body).items;
}
