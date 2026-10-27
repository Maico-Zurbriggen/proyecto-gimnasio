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
  /** RN-104: sin consentimiento no se cargan peso ni altura. */
  healthDataConsent: z.boolean(),
  healthConsentText: z.string(),
  complete: z.boolean(),
});

export type StudentContext = z.infer<typeof studentContextSchema>;

export const goalRecordSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(GOAL_TYPES),
  startsOn: z.string(),
  endsOn: z.string().nullable(),
});

export const goalsSnapshotSchema = z.object({
  timezone: z.string(),
  current: goalRecordSchema.nullable(),
  history: z.array(goalRecordSchema),
  atDate: goalRecordSchema.nullable(),
  context: z.object({
    sufficient: z.boolean(),
    missing: z.array(z.string()),
  }),
});

export type GoalsSnapshot = z.infer<typeof goalsSnapshotSchema>;

export const goalDeclarationResultSchema = z.object({
  goal: goalRecordSchema,
  changed: z.boolean(),
  timezone: z.string(),
});

export type GoalDeclarationResult = z.infer<typeof goalDeclarationResultSchema>;

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
export const goalsQueryKey = (studentId: string) =>
  ['students', studentId, 'goals'] as const;

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

/** Objetivo vigente e historial declarado del alumno (HU10). */
export async function fetchGoals(
  studentId: string,
  signal?: AbortSignal,
): Promise<GoalsSnapshot> {
  return goalsSnapshotSchema.parse(
    await apiGet(`/students/${encodeURIComponent(studentId)}/goals`, {
      signal,
    }),
  );
}

/** `POST /students/:studentId/goals` (HU10): objetivo vigente del alumno. */
export async function declareGoal(
  studentId: string,
  type: (typeof GOAL_TYPES)[number],
): Promise<GoalDeclarationResult> {
  return goalDeclarationResultSchema.parse(
    await apiPost(`/students/${encodeURIComponent(studentId)}/goals`, { type }),
  );
}

/** `POST /students/me/health-consent`: otorgar el consentimiento después del alta. */
export async function grantHealthConsent(): Promise<StudentContext> {
  return studentContextSchema.parse(
    await apiPost('/students/me/health-consent', {}),
  );
}
