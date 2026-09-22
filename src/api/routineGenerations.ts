import { z } from 'zod';

import { apiGet, apiPost } from './client';

const STATUS_ALIASES: Record<string, string> = {
  PENDING: 'PENDIENTE',
  QUEUED: 'PENDIENTE',
  PROCESSING: 'PROCESANDO',
  COMPLETED: 'COMPLETADA',
  UNAVAILABLE: 'NO_DISPONIBLE',
  CANCELLED: 'CANCELADA',
  CANCELED: 'CANCELADA',
};

const routineGenerationStatusSchema = z
  .string()
  .transform((status) => {
    const normalized = status.toUpperCase();
    return STATUS_ALIASES[normalized] ?? normalized;
  })
  .pipe(
    z.enum([
      'PENDIENTE',
      'PROCESANDO',
      'COMPLETADA',
      'NO_DISPONIBLE',
      'CANCELADA',
    ]),
  );

const routineGenerationAcceptedSchema = z.object({
  requestId: z.string().uuid(),
  status: routineGenerationStatusSchema,
});

const routineGenerationSnapshotSchema = routineGenerationAcceptedSchema.extend({
  estructuraCandidata: z.unknown().nullable(),
  violaciones: z.array(z.string()).nullable(),
  error: z.string().nullable(),
});

export type RoutineGenerationStatus = z.infer<
  typeof routineGenerationStatusSchema
>;
export type RoutineGenerationAccepted = z.infer<
  typeof routineGenerationAcceptedSchema
>;
export type RoutineGenerationSnapshot = z.infer<
  typeof routineGenerationSnapshotSchema
>;

export interface RequestRoutineGenerationInput {
  textoLibre: string;
  idempotencyKey: string;
}

export const TERMINAL_GENERATION_STATUSES: readonly RoutineGenerationStatus[] =
  ['COMPLETADA', 'NO_DISPONIBLE', 'CANCELADA'];

export function isTerminalGenerationStatus(
  status: RoutineGenerationStatus,
): boolean {
  return TERMINAL_GENERATION_STATUSES.includes(status);
}

/** Solicita al backend una generación asíncrona para un alumno. */
export async function requestRoutineGeneration(
  studentId: string,
  input: RequestRoutineGenerationInput,
): Promise<RoutineGenerationAccepted> {
  const body = await apiPost(
    `/students/${encodeURIComponent(studentId)}/routine-generations`,
    input,
  );
  return routineGenerationAcceptedSchema.parse(body);
}

/** Consulta exclusivamente al backend; el frontend nunca conoce la API de IA. */
export async function fetchRoutineGeneration(
  studentId: string,
  requestId: string,
  signal?: AbortSignal,
): Promise<RoutineGenerationSnapshot> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/routine-generations/${encodeURIComponent(requestId)}`,
    { signal },
  );
  return routineGenerationSnapshotSchema.parse(body);
}
