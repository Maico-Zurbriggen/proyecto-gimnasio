import { z } from 'zod';

import { apiGet, apiPost, type ApiRequestOptions } from './client';
import { evolutionDiagnosticDataOriginSchema } from './generated/adaptation-demo';

export const evolutionSituationSchema = z.enum([
  'DATOS_INSUFICIENTES',
  'SOBREEXIGENCIA',
  'PROGRESION_ADECUADA',
  'ESTIMULO_INSUFICIENTE',
  'ESTANCAMIENTO',
]);

const exerciseDiagnosticSchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string(),
  situation: evolutionSituationSchema,
  metrics: z.unknown(),
});

const availableDiagnosticSchema = z.object({
  disponible: z.literal(true),
  diagnosticId: z.string(),
  studentId: z.string(),
  routineVersionId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  globalSituation: evolutionSituationSchema,
  adherencia: z.number().nullable(),
  criteriosNoEvaluados: z.array(z.string()),
  componentVersion: z.string(),
  dataOrigin: evolutionDiagnosticDataOriginSchema.optional(),
  calculadoEl: z.string(),
  ejercicios: z.array(exerciseDiagnosticSchema),
});

const unavailableDiagnosticSchema = z.object({
  studentId: z.string(),
  disponible: z.literal(false),
  motivo: z.literal('SIN_DIAGNOSTICO_CALCULADO'),
});

export const evolutionDiagnosticSchema = z.discriminatedUnion('disponible', [
  availableDiagnosticSchema,
  unavailableDiagnosticSchema,
]);

const diagnosticCalculationSchema = z.object({
  diagnosticId: z.string(),
  globalSituation: evolutionSituationSchema,
  exerciseCount: z.number().int().nonnegative(),
});

export type EvolutionDiagnostic = z.infer<typeof evolutionDiagnosticSchema>;

export async function getEvolutionDiagnostic(
  studentId: string,
  options: ApiRequestOptions = {},
): Promise<EvolutionDiagnostic> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/evolution-diagnostic`,
    options,
  );
  return evolutionDiagnosticSchema.parse(body);
}

export async function recalculateEvolutionDiagnostic(studentId: string) {
  const body = await apiPost(
    `/students/${encodeURIComponent(studentId)}/evolution-diagnostic`,
    {},
  );
  return diagnosticCalculationSchema.parse(body);
}
