import { z } from 'zod';

import { apiPost } from './client';

/**
 * Contrato del endpoint de carga de medidas (HU02-T1). Escrito a mano hasta que
 * el backend publique OpenAPI.
 */
export const measurementSchema = z.object({
  studentId: z.string(),
  weightKg: z.number(),
  heightCm: z.number(),
  /** `YYYY-MM-DD` */
  measuredOn: z.string(),
  /** `true` cuando sustituyó una medición previa del mismo tipo y fecha. */
  replacedPrevious: z.boolean(),
});

/**
 * Detalle de un valor fuera de rango, tal como lo devuelve el backend en un 400
 * (`measurement_out_of_range`). Alimenta el feedback por campo de HU02-T4.
 */
export const rangeViolationSchema = z.object({
  field: z.enum(['weightKg', 'heightCm']),
  value: z.number(),
  min: z.number(),
  max: z.number(),
  unit: z.enum(['kg', 'cm']),
  message: z.string(),
});

export const outOfRangeBodySchema = z.object({
  error: z.literal('measurement_out_of_range'),
  violations: z.array(rangeViolationSchema),
});

export type Measurement = z.infer<typeof measurementSchema>;
export type RangeViolation = z.infer<typeof rangeViolationSchema>;

export interface RecordMeasurementInput {
  weightKg: number;
  heightCm: number;
}

/**
 * `POST /students/:studentId/measurements`: registra peso y altura y sustituye
 * cualquier medición previa del mismo día (HU02-T1).
 */
export async function recordMeasurement(
  studentId: string,
  input: RecordMeasurementInput,
): Promise<Measurement> {
  const body = await apiPost(
    `/students/${encodeURIComponent(studentId)}/measurements`,
    input,
    { as: 'ALUMNO' },
  );
  return measurementSchema.parse(body);
}

/**
 * Extrae las violaciones de rango del cuerpo de un `ApiError`.
 *
 * El servidor es la autoridad sobre los rangos (HU02, Esc. 1.1 y 1.2): si su
 * respuesta trae el detalle por campo, se muestra ése en lugar del mensaje
 * genérico del formulario. Devuelve `[]` cuando el error es de otra naturaleza.
 */
export function parseRangeViolations(body: unknown): RangeViolation[] {
  const parsed = outOfRangeBodySchema.safeParse(body);
  return parsed.success ? parsed.data.violations : [];
}
