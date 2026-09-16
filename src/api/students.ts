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
  motivoBloqueo: z.string().nullable(),
  /** `YYYY-MM-DD` */
  fechaUltimaMedicion: z.string().nullable(),
  faltasConsecutivas: z.number().int(),
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
  propuestasPendientes: z.number().int(),
});

export type StudentStatus = z.infer<typeof studentStatusSchema>;
export type TrainerStudent = z.infer<typeof trainerStudentSchema>;

export interface UnlockStudentInput {
  weightKg: number;
  heightCm: number;
}

/** `GET /trainers/me/students`: cartera del entrenador autenticado. */
export async function fetchTrainerStudents(
  signal?: AbortSignal,
): Promise<TrainerStudent[]> {
  const body = await apiGet('/trainers/me/students', {
    as: 'ENTRENADOR',
    signal,
  });
  return z.array(trainerStudentSchema).parse(body);
}

/** `GET /students/:studentId/status`: bloqueo, motivo y última medición (HU05-T2). */
export async function fetchStudentStatus(
  studentId: string,
  signal?: AbortSignal,
): Promise<StudentStatus> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/status`,
    { as: 'ENTRENADOR', signal },
  );
  return studentStatusSchema.parse(body);
}

/**
 * `POST /students/:studentId/unlock`: desbloqueo con la medición adeudada
 * (HU05-T1). El backend lo hace en una única transacción.
 */
export async function unlockStudent(
  studentId: string,
  input: UnlockStudentInput,
): Promise<StudentStatus> {
  const body = await apiPost(
    `/students/${encodeURIComponent(studentId)}/unlock`,
    input,
    { as: 'ENTRENADOR' },
  );
  return studentStatusSchema.parse(body);
}
