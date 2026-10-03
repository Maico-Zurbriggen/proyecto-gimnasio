import { z } from 'zod';

import { apiGet, apiPost } from './client';

/**
 * Contrato de los endpoints de alumnos del backend (`StudentStatusDto` y
 * `TrainerStudentDto`). Escrito a mano hasta que el backend publique OpenAPI.
 */
export const studentStatusSchema = z.object({
  studentId: z.string(),
  displayName: z.string(),
  bloqueado: z.boolean(),
  measurementBlockState: z.enum([
    'NORMAL',
    'PENDIENTE_MEDICION',
    'PENDIENTE_APROBACION',
  ]),
  motivoBloqueo: z.string().nullable(),
  /** `YYYY-MM-DD` */
  fechaUltimaMedicion: z.string().nullable(),
  faltasConsecutivas: z.number().int(),
  blockedAt: z.string().nullable(),
  submittedAt: z.string().nullable(),
  alturaCm: z.number(),
});

export const trainerStudentSchema = studentStatusSchema.extend({
  objetivo: z.string().nullable(),
  rutinaVigente: z
    .object({
      routineType: z.string(),
      diasRestantesRenovacion: z.number().int(),
      estadoAviso: z.enum(['pendiente', 'cerrado hoy', 'vencido']),
    })
    .nullable(),
  rutinasPendientesRevision: z.number().int().nonnegative(),
  propuestasAdaptacionPendientes: z.number().int().nonnegative(),
});

export type StudentStatus = z.infer<typeof studentStatusSchema>;
export type TrainerStudent = z.infer<typeof trainerStudentSchema>;

/** `GET /trainers/me/students`: cartera del entrenador autenticado. */
export async function fetchTrainerStudents(
  signal?: AbortSignal,
): Promise<TrainerStudent[]> {
  const body = await apiGet('/trainers/me/students', { signal });
  return z.array(trainerStudentSchema).parse(body);
}

/** `GET /students/:studentId/status`: bloqueo, motivo y última medición (HU05-T2). */
export async function fetchStudentStatus(
  studentId: string,
  signal?: AbortSignal,
): Promise<StudentStatus> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/status`,
    { signal },
  );
  return studentStatusSchema.parse(body);
}

/** Estado propio que sigue disponible durante el bloqueo funcional. */
export async function fetchOwnMeasurementBlock(
  signal?: AbortSignal,
): Promise<StudentStatus> {
  const body = await apiGet('/students/me/measurement-block', { signal });
  return studentStatusSchema.parse(body);
}

/**
 * `POST /students/:studentId/unlock`: aprobación del entrenador, sin body.
 */
export async function unlockStudent(studentId: string): Promise<StudentStatus> {
  const body = await apiPost(
    `/students/${encodeURIComponent(studentId)}/unlock`,
    {},
  );
  return studentStatusSchema.parse(body);
}
