import { z } from 'zod';

import { apiGet, apiPost } from './client';

/**
 * Condiciones físicas del alumno (HU11). Escrito a mano hasta que el backend
 * publique el cliente generado.
 */

/** Zona corporal: 17 grupos musculares y 8 articulaciones (D2/§4.2-4.3). */
export const MUSCLE_GROUPS = [
  ['PECTORAL', 'Pectoral'],
  ['DELTOIDES_ANTERIOR', 'Deltoides anterior'],
  ['DELTOIDES_LATERAL', 'Deltoides lateral'],
  ['DELTOIDES_POSTERIOR', 'Deltoides posterior'],
  ['BICEPS', 'Bíceps'],
  ['TRICEPS', 'Tríceps'],
  ['ANTEBRAZO', 'Antebrazo'],
  ['ABDOMINALES', 'Abdominales'],
  ['OBLICUOS', 'Oblicuos'],
  ['DORSAL', 'Dorsal'],
  ['TRAPECIO', 'Trapecio'],
  ['ERECTORES_LUMBARES', 'Erectores lumbares'],
  ['GLUTEO', 'Glúteo'],
  ['CUADRICEPS', 'Cuádriceps'],
  ['ISQUIOTIBIALES', 'Isquiotibiales'],
  ['ADUCTORES', 'Aductores'],
  ['GEMELOS', 'Gemelos'],
] as const;

export const JOINTS = [
  ['HOMBRO', 'Hombro'],
  ['CODO', 'Codo'],
  ['MUNECA', 'Muñeca'],
  ['COLUMNA_CERVICAL', 'Columna cervical'],
  ['COLUMNA_LUMBAR', 'Columna lumbar'],
  ['CADERA', 'Cadera'],
  ['RODILLA', 'Rodilla'],
  ['TOBILLO', 'Tobillo'],
] as const;

export const BODY_ZONE_LABELS: Record<string, string> = Object.fromEntries([
  ...MUSCLE_GROUPS,
  ...JOINTS,
]);

export const SEVERITIES = [
  ['LEVE', 'Leve'],
  ['MODERADA', 'Moderada'],
  ['SEVERA', 'Severa'],
] as const;

export type Severity = (typeof SEVERITIES)[number][0];

export const physicalConditionSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  bodyZoneCode: z.string(),
  severity: z.enum(['LEVE', 'MODERADA', 'SEVERA']),
  description: z.string().nullable(),
  /** `YYYY-MM-DD` */
  startsOn: z.string(),
  endsOn: z.string().nullable(),
  vigente: z.boolean(),
});

export const conditionsStatusSchema = z.object({
  healthDataConsent: z.boolean(),
  declaredNone: z.boolean(),
  declaredNoneAt: z.string().nullable(),
  activeCount: z.number().int(),
});

export type PhysicalCondition = z.infer<typeof physicalConditionSchema>;
export type ConditionsStatus = z.infer<typeof conditionsStatusSchema>;

export function conditionsQueryKey(studentId: string) {
  return ['students', studentId, 'conditions'] as const;
}

export function conditionsStatusQueryKey(studentId: string) {
  return ['students', studentId, 'conditions', 'status'] as const;
}

const base = (studentId: string) =>
  `/students/${encodeURIComponent(studentId)}/conditions`;

export async function fetchConditions(
  studentId: string,
  signal?: AbortSignal,
): Promise<PhysicalCondition[]> {
  return z
    .array(physicalConditionSchema)
    .parse(await apiGet(base(studentId), { signal }));
}

export async function fetchConditionsStatus(
  studentId: string,
  signal?: AbortSignal,
): Promise<ConditionsStatus> {
  return conditionsStatusSchema.parse(
    await apiGet(`${base(studentId)}/status`, { signal }),
  );
}

export async function declareCondition(
  studentId: string,
  input: {
    bodyZoneCode: string;
    severity: Severity;
    description?: string;
    startsOn?: string;
  },
): Promise<PhysicalCondition> {
  return physicalConditionSchema.parse(await apiPost(base(studentId), input));
}

export async function closeCondition(
  studentId: string,
  conditionId: string,
): Promise<PhysicalCondition> {
  return physicalConditionSchema.parse(
    await apiPost(
      `${base(studentId)}/${encodeURIComponent(conditionId)}/close`,
      {},
    ),
  );
}

export async function declareNoConditions(
  studentId: string,
): Promise<ConditionsStatus> {
  return conditionsStatusSchema.parse(
    await apiPost(`${base(studentId)}/none`, {}),
  );
}
