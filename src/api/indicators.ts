import { z } from 'zod';

import { apiGet } from './client';

export const insufficientDataSchema = z.object({
  status: z.literal('SIN_DATOS_SUFICIENTES'),
  missing: z.string(),
  unit: z.string(),
  required: z.number(),
  available: z.number(),
  remaining: z.number(),
  action: z.string(),
});
export type InsufficientData = z.infer<typeof insufficientDataSchema>;

export const adherenceDataSchema = z.discriminatedUnion('disponible', [
  z.object({
    disponible: z.literal(true),
    porcentaje: z.number(),
    sesionesCompletadas: z.number(),
    sesionesEsperadas: z.number(),
  }),
  z.object({
    disponible: z.literal(false),
    status: z.literal('SIN_DATOS_SUFICIENTES'),
    missing: z.string(),
    unit: z.string(),
    required: z.number(),
    available: z.number(),
    remaining: z.number(),
    action: z.string(),
  }),
]);

export const adherenceResponseSchema = z.object({
  studentId: z.string(),
  adherencia: adherenceDataSchema,
  calculadoEl: z.string(),
});
export type AdherenceDto = z.infer<typeof adherenceResponseSchema>;

export const complianceDataSchema = z.discriminatedUnion('disponible', [
  z.object({
    disponible: z.literal(true),
    porcentaje: z.number(),
    numerador: z.number(),
    denominador: z.number(),
  }),
  z.object({
    disponible: z.literal(false),
    status: z.literal('SIN_DATOS_SUFICIENTES'),
    missing: z.string(),
    unit: z.string(),
    required: z.number(),
    available: z.number(),
    remaining: z.number(),
    action: z.string(),
  }),
]);

export const sessionComplianceResponseSchema = z.object({
  sessionId: z.string(),
  cumplimientoDeSeries: complianceDataSchema,
  cumplimientoDeRepeticiones: complianceDataSchema,
  calculadoEl: z.string(),
});
export type SessionComplianceDto = z.infer<
  typeof sessionComplianceResponseSchema
>;

export const muscleGroupActivitySchema = z.object({
  group: z.string(),
  status: z.enum(['CALCULADO', 'SIN_DATOS']),
  volume: z.number().nullable(),
  frequency: z.number().nullable(),
});
export type MuscleGroupActivity = z.infer<typeof muscleGroupActivitySchema>;

export const exerciseVolumeSchema = z.object({
  exerciseId: z.string().nullable(),
  completedWorkSets: z.number(),
  unit: z.literal('SERIES_DE_TRABAJO'),
  classification: z.enum(['CLASIFICADO', 'NO_CLASIFICADO']),
});
export type ExerciseVolume = z.infer<typeof exerciseVolumeSchema>;

export const muscleActivityResponseSchema = z.object({
  studentId: z.string(),
  from: z.string(),
  to: z.string(),
  timezone: z.string(),
  sessionCount: z.number(),
  insufficientData: insufficientDataSchema.nullable(),
  unclassifiedSets: z.number(),
  unit: z.literal('SERIES_EFECTIVAS'),
  groups: z.array(muscleGroupActivitySchema),
  exerciseVolumes: z.array(exerciseVolumeSchema),
  calculatedAt: z.string(),
});
export type MuscleActivityDto = z.infer<typeof muscleActivityResponseSchema>;

export const estancamientoDetalleSchema = z.object({
  exerciseId: z.string(),
  variacionPorcentual: z.number(),
  sesionesConsideradas: z.number(),
});
export type EstancamientoDetalle = z.infer<typeof estancamientoDetalleSchema>;

export const caidaAdherenciaDetalleSchema = z.object({
  adherenciaReciente: z.number(),
  adherenciaPrevia: z.number(),
  caidaEnPuntos: z.number(),
});
export type CaidaAdherenciaDetalle = z.infer<
  typeof caidaAdherenciaDetalleSchema
>;

export const desbalanceItemSchema = z.object({
  grupo: z.string(),
  seriesSemanales: z.number(),
  tipo: z.enum(['POR_DEFECTO', 'POR_EXCESO']),
});
export type DesbalanceItem = z.infer<typeof desbalanceItemSchema>;

export const senalEstancamientoSchema = z.object({
  sobre: z.string().optional(),
  estado: z.enum(['DETECTADA', 'SIN_SENAL', 'DATOS_INSUFICIENTES']),
  detalle: estancamientoDetalleSchema.optional(),
  status: z.literal('SIN_DATOS_SUFICIENTES').optional(),
  missing: z.string().optional(),
  unit: z.string().optional(),
  required: z.number().optional(),
  available: z.number().optional(),
  remaining: z.number().optional(),
  action: z.string().optional(),
});
export type SenalEstancamiento = z.infer<typeof senalEstancamientoSchema>;

export const senalCaidaAdherenciaSchema = z.object({
  sobre: z.string().optional(),
  estado: z.enum(['DETECTADA', 'SIN_SENAL', 'DATOS_INSUFICIENTES']),
  detalle: caidaAdherenciaDetalleSchema.optional(),
  status: z.literal('SIN_DATOS_SUFICIENTES').optional(),
  missing: z.string().optional(),
  unit: z.string().optional(),
  required: z.number().optional(),
  available: z.number().optional(),
  remaining: z.number().optional(),
  action: z.string().optional(),
});
export type SenalCaidaAdherencia = z.infer<typeof senalCaidaAdherenciaSchema>;

export const senalDesbalanceSchema = z.object({
  sobre: z.string().optional(),
  estado: z.enum(['DETECTADA', 'SIN_SENAL', 'DATOS_INSUFICIENTES']),
  detalle: z.array(desbalanceItemSchema).optional(),
  status: z.literal('SIN_DATOS_SUFICIENTES').optional(),
  missing: z.string().optional(),
  unit: z.string().optional(),
  required: z.number().optional(),
  available: z.number().optional(),
  remaining: z.number().optional(),
  action: z.string().optional(),
});
export type SenalDesbalance = z.infer<typeof senalDesbalanceSchema>;

export const signalsResponseSchema = z.object({
  studentId: z.string(),
  estancamiento: z.array(senalEstancamientoSchema),
  caidaDeAdherencia: senalCaidaAdherenciaSchema,
  desbalance: senalDesbalanceSchema,
  seriesSinClasificar: z.number(),
  calculadoEl: z.string(),
});
export type SignalsDto = z.infer<typeof signalsResponseSchema>;

/** Consulta la adherencia sobre la ventana móvil de 4 semanas (HU23 / HU34). */
export async function fetchAdherence(
  studentId: string,
  signal?: AbortSignal,
): Promise<AdherenceDto> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/indicators/adherence`,
    { signal },
  );
  return adherenceResponseSchema.parse(body);
}

/** Consulta el cumplimiento de series y repeticiones de una sesión (HU23 / HU34). */
export async function fetchSessionCompliance(
  studentId: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<SessionComplianceDto> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/sessions/${encodeURIComponent(sessionId)}/compliance`,
    { signal },
  );
  return sessionComplianceResponseSchema.parse(body);
}

/** Consulta el volumen y frecuencia por grupo muscular en un período (HU25 / HU34). */
export async function fetchMuscleActivity(
  studentId: string,
  period: { from: string; to: string },
  signal?: AbortSignal,
): Promise<MuscleActivityDto> {
  const query = new URLSearchParams({
    from: period.from,
    to: period.to,
  }).toString();
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/indicators/muscle-activity?${query}`,
    { signal },
  );
  return muscleActivityResponseSchema.parse(body);
}

/** Consulta las señales de estancamiento, caída y desbalance (HU26 / HU35). */
export async function fetchSignals(
  studentId: string,
  signal?: AbortSignal,
): Promise<SignalsDto> {
  const body = await apiGet(
    `/students/${encodeURIComponent(studentId)}/indicators/signals`,
    { signal },
  );
  return signalsResponseSchema.parse(body);
}
