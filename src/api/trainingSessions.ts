import { z } from 'zod';

import { apiGet, apiPatch, apiPost } from './client';

/**
 * Contrato de la sesión (RF-027, `openapi/training-sessions.openapi.json`).
 * Escrito a mano hasta el cliente generado desde OpenAPI.
 *
 * Pausar no es una transición del backend (D6/§4): es estado local del
 * cliente con borrador conservado (CB-25, FL-07).
 */
export const trainingSessionStateSchema = z.enum([
  'EN_CURSO',
  'COMPLETADA',
  'ABANDONADA',
  'BLOQUEADA',
]);

export const sessionSetRecordSchema = z.object({
  position: z.number().int(),
  prescribedExerciseId: z.string(),
  prescribedExerciseName: z.string(),
  performedExerciseId: z.string().nullable(),
  performedExerciseName: z.string().nullable(),
  prescribedMinRepetitions: z.number().int(),
  prescribedMaxRepetitions: z.number().int(),
  prescribedLoad: z.number().nullable(),
  warmup: z.boolean(),
  performedLoad: z.number().nullable(),
  performedRepetitions: z.number().int().nullable(),
  perceivedEffort: z.number().int().nullable(),
  completed: z.boolean(),
  additional: z.boolean(),
  omissionReason: z.string().nullable(),
  atypicalConfirmed: z.boolean(),
});

export const trainingSessionSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  routineId: z.string(),
  routineVersionId: z.string(),
  routineDayId: z.string(),
  routineDayName: z.string(),
  routineDayPosition: z.number().int(),
  state: trainingSessionStateSchema,
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  occurredOn: z.string(),
  lastActivityAt: z.string(),
  aptitudeWarning: z.enum(['AUSENTE', 'VENCIDA']).nullable(),
  compatibilityWarnings: z.array(
    z.object({ exerciseId: z.string(), state: z.string() }),
  ),
  setRecords: z.array(sessionSetRecordSchema),
});

export type TrainingSessionState = z.infer<typeof trainingSessionStateSchema>;
export type SessionSetRecord = z.infer<typeof sessionSetRecordSchema>;
export type TrainingSession = z.infer<typeof trainingSessionSchema>;

export const trainingSessionSummarySchema = z.object({
  id: z.string(),
  studentId: z.string(),
  routineDayName: z.string(),
  routineDayPosition: z.number().int(),
  state: trainingSessionStateSchema,
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  occurredOn: z.string(),
  totalSeries: z.number().int(),
  completedSeries: z.number().int(),
});

export const trainingSessionPageSchema = z.object({
  items: z.array(trainingSessionSummarySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type TrainingSessionSummary = z.infer<
  typeof trainingSessionSummarySchema
>;
export type TrainingSessionPage = z.infer<typeof trainingSessionPageSchema>;

export type HistoryStateFilter =
  'TODAS' | 'EN_CURSO' | 'COMPLETADA' | 'ABANDONADA' | 'BLOQUEADA';

export interface UpdateSeriesInput {
  performedLoad?: number | null;
  performedRepetitions?: number | null;
  perceivedEffort?: number | null;
  completed?: boolean;
  additional?: boolean;
  omissionReason?: string | null;
  performedExerciseId?: string | null;
  atypicalConfirmed?: boolean;
}

/** `POST /students/:studentId/training-sessions`: iniciar (FL-05). */
export async function startTrainingSession(
  studentId: string,
  input: { routineDayId?: string } = {},
): Promise<TrainingSession> {
  const body = await apiPost(
    `/students/${encodeURIComponent(studentId)}/training-sessions`,
    input.routineDayId ? { routineDayId: input.routineDayId } : {},
  );
  return trainingSessionSchema.parse(body);
}

/** `GET /training-sessions/active`: reanudar la sesión en curso (FL-07). */
export async function fetchActiveTrainingSession(
  signal?: AbortSignal,
): Promise<TrainingSession> {
  const body = await apiGet('/training-sessions/active', { signal });
  return trainingSessionSchema.parse(body);
}

/** `PATCH .../records/:position`: registrar una serie (RF-029, RN-55). */
export async function updateSeriesRecord(
  studentId: string,
  sessionId: string,
  position: number,
  input: UpdateSeriesInput,
): Promise<TrainingSession> {
  // Allowlist exacta del contrato: el schema del backend es estricto y
  // rechaza claves extra como `position`, que viaja en la URL.
  const {
    performedLoad,
    performedRepetitions,
    perceivedEffort,
    completed,
    additional,
    omissionReason,
    performedExerciseId,
    atypicalConfirmed,
  } = input;
  const body = await apiPatch(
    `/students/${encodeURIComponent(studentId)}/training-sessions/${encodeURIComponent(sessionId)}/records/${position}`,
    {
      performedLoad,
      performedRepetitions,
      perceivedEffort,
      completed,
      additional,
      omissionReason,
      performedExerciseId,
      atypicalConfirmed,
    },
  );
  return trainingSessionSchema.parse(body);
}

/** `POST .../finish`: cierre manual a COMPLETADA (D6/§4). */
export async function finishTrainingSession(
  studentId: string,
  sessionId: string,
): Promise<TrainingSession> {
  const body = await apiPost(
    `/students/${encodeURIComponent(studentId)}/training-sessions/${encodeURIComponent(sessionId)}/finish`,
    {},
  );
  return trainingSessionSchema.parse(body);
}

/** `POST .../abandon`: descartar a ABANDONADA (FL-07 A1). */
export async function abandonTrainingSession(
  studentId: string,
  sessionId: string,
): Promise<TrainingSession> {
  const body = await apiPost(
    `/students/${encodeURIComponent(studentId)}/training-sessions/${encodeURIComponent(sessionId)}/abandon`,
    {},
  );
  return trainingSessionSchema.parse(body);
}

/** `GET .../training-sessions`: historial paginado (RF-035). */
export async function fetchTrainingSessions(
  studentId: string,
  query: {
    state?: Exclude<HistoryStateFilter, 'TODAS'>;
    page?: number;
    pageSize?: number;
  } = {},
  signal?: AbortSignal,
): Promise<TrainingSessionPage> {
  const params = new URLSearchParams();
  if (query.state) params.set('state', query.state);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/training-sessions${suffix}`,
    { signal },
  );
  return trainingSessionPageSchema.parse(body);
}

/** `GET .../training-sessions/:sessionId`: detalle prescripto vs ejecutado. */
export async function fetchTrainingSession(
  studentId: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<TrainingSession> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/training-sessions/${encodeURIComponent(sessionId)}`,
    { signal },
  );
  return trainingSessionSchema.parse(body);
}

/** Contrato de precarga de series (HU22-T2). */
export const origenDePrecargaSchema = z.enum([
  'ULTIMA_EJECUCION',
  'CARGA_SUGERIDA',
  'SIN_DATOS',
]);

export const seriePrecargadaSchema = z.object({
  position: z.number().int(),
  exerciseId: z.string(),
  repeticionesMinimas: z.number().int(),
  repeticionesMaximas: z.number().int(),
  warmup: z.boolean(),
  carga: z.number().nullable(),
  repeticiones: z.number().int().nullable(),
  origen: origenDePrecargaSchema,
  antiguedadEnDias: z.number().int().nullable(),
});

export const setPreloadSchema = z.object({
  studentId: z.string(),
  routineDayId: z.string(),
  series: z.array(seriePrecargadaSchema),
  calculadoEl: z.string(),
});

export type OrigenDePrecarga = z.infer<typeof origenDePrecargaSchema>;
export type SeriePrecargada = z.infer<typeof seriePrecargadaSchema>;
export type SetPreload = z.infer<typeof setPreloadSchema>;

/** Valores con los que se presenta cada serie del día (RF-030). */
export async function fetchSetPreload(
  studentId: string,
  routineDayId: string,
  signal?: AbortSignal,
): Promise<SetPreload> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/routine-days/${encodeURIComponent(routineDayId)}/set-preload`,
    { signal },
  );
  return setPreloadSchema.parse(body);
}
