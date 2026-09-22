import { z } from 'zod';

import { ApiError, apiGet, apiPost } from './client';

/**
 * Contrato de las rutas de generación de rutinas del backend, tomado de
 * `RoutineGenerationSnapshot`. Escrito a mano porque el backend todavía no
 * publica OpenAPI; reemplazar por el cliente generado cuando exista.
 */
export const generationRequestSchema = z.object({
  requestId: z.string(),
  status: z.string(),
});

const recoverableDispatchFailureSchema = generationRequestSchema.extend({
  error: z.literal('ai_service_unavailable'),
});

export const generationSnapshotSchema = z.object({
  requestId: z.string(),
  status: z.string(),
  estructuraCandidata: z.unknown().nullable(),
  violaciones: z.array(z.string()).nullable(),
  error: z.string().nullable(),
});

export type GenerationRequest = z.infer<typeof generationRequestSchema>;
export type GenerationSnapshot = z.infer<typeof generationSnapshotSchema>;

/** Estados terminales: el polling se detiene al alcanzarlos. */
export const TERMINAL_GENERATION_STATES: ReadonlySet<string> = new Set([
  'COMPLETADA',
  'NO_DISPONIBLE',
  'CANCELADA',
]);

/**
 * Resumen de un candidato para mostrar. Todo opcional: si la estructura no
 * trae estos campos, la sección igual indica que el candidato está listo.
 */
const candidateSummarySchema = z.object({
  routine_type: z.string().optional(),
  target_weekly_frequency: z.number().optional(),
  days: z.array(z.unknown()).optional(),
  explanation: z.string().optional(),
});

export type CandidateSummary = z.infer<typeof candidateSummarySchema>;

export function parseCandidateSummary(value: unknown): CandidateSummary | null {
  const parsed = candidateSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export interface RequestGenerationInput {
  textoLibre: string;
}

/**
 * `POST /students/:studentId/routine-generations`: el alumno pide actualizar
 * su rutina desde su perfil. El backend minimiza el contexto y despacha a IA.
 */
export async function requestRoutineGeneration(
  studentId: string,
  input: RequestGenerationInput,
  signal?: AbortSignal,
): Promise<GenerationRequest> {
  try {
    const body = await apiPost(
      `/students/${encodeURIComponent(studentId)}/routine-generations`,
      { textoLibre: input.textoLibre },
      { signal },
    );
    return generationRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'ai_service_unavailable') {
      const persisted = recoverableDispatchFailureSchema.safeParse(error.body);
      if (persisted.success) {
        return generationRequestSchema.parse(persisted.data);
      }
    }
    throw error;
  }
}

/**
 * `GET /students/:studentId/routine-generations/:requestId`: estado de una
 * solicitud propia del alumno.
 */
export async function fetchGeneration(
  studentId: string,
  requestId: string,
  signal?: AbortSignal,
): Promise<GenerationSnapshot> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/routine-generations/${encodeURIComponent(requestId)}`,
    { signal },
  );
  return generationSnapshotSchema.parse(body);
}

/** Última solicitud persistida del alumno, si existe. */
export async function fetchLatestGeneration(
  studentId: string,
  signal?: AbortSignal,
): Promise<GenerationSnapshot | null> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/routine-generations/latest`,
    { signal },
  );
  return generationSnapshotSchema.nullable().parse(body);
}
