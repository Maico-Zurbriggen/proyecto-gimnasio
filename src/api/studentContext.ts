import { z } from 'zod';

import { apiGet, apiPost, apiPut } from './client';

/**
 * Contrato de la puesta en contexto del alumno (FL-01): `GET/PUT
 * /students/me/context` y la declaración de objetivo de HU10. Escrito a mano
 * hasta que el backend publique el cliente generado.
 */
export const EXPERIENCE_LEVELS = [
  'PRINCIPIANTE',
  'INTERMEDIO',
  'AVANZADO',
] as const;
export const SEXES = ['FEMENINO', 'MASCULINO'] as const;
export const GOAL_TYPES = [
  'FUERZA',
  'HIPERTROFIA',
  'RESISTENCIA_MUSCULAR',
  'ACONDICIONAMIENTO_GENERAL',
] as const;

export const studentContextSchema = z.object({
  experienceLevel: z.enum(EXPERIENCE_LEVELS).nullable(),
  availableDaysPerWeek: z.number().int().nullable(),
  birthDate: z.string().nullable(),
  sex: z.enum(SEXES).nullable(),
  heightCm: z.number().nullable(),
  weightKg: z.number().nullable(),
  /** Profesor asignado; `null` mientras el gimnasio no asigne uno. */
  trainer: z.object({ id: z.string(), displayName: z.string() }).nullable(),
  complete: z.boolean(),
});

export type StudentContext = z.infer<typeof studentContextSchema>;

export interface StudentContextInput {
  experienceLevel: (typeof EXPERIENCE_LEVELS)[number];
  availableDaysPerWeek: number;
  /** `YYYY-MM-DD` */
  birthDate: string;
  sex: (typeof SEXES)[number];
  heightCm: number;
  weightKg: number;
}

export const studentContextQueryKey = ['students', 'me', 'context'] as const;

export async function fetchOwnContext(
  signal?: AbortSignal,
): Promise<StudentContext> {
  return studentContextSchema.parse(
    await apiGet('/students/me/context', { signal }),
  );
}

export async function saveOwnContext(
  input: StudentContextInput,
): Promise<StudentContext> {
  return studentContextSchema.parse(
    await apiPut('/students/me/context', input),
  );
}

/** `POST /students/:studentId/goals` (HU10): objetivo vigente del alumno. */
export async function declareGoal(
  studentId: string,
  type: (typeof GOAL_TYPES)[number],
): Promise<void> {
  await apiPost(`/students/${encodeURIComponent(studentId)}/goals`, { type });
}
