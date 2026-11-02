import { z } from 'zod';

/** Estado `SIN_DATOS_SUFICIENTES` que devuelve el backend cuando falta información para un análisis. */
export const insufficientInfoSchema = z.object({
  status: z.literal('SIN_DATOS_SUFICIENTES'),
  missing: z.string(),
  unit: z.string().optional(),
  required: z.number().optional(),
  available: z.number().optional(),
  remaining: z.number().optional(),
  action: z.string().optional(),
});

export type InsufficientInfoData = z.infer<typeof insufficientInfoSchema>;

/** Devuelve el estado parseado o `null` si el valor no es una respuesta SIN_DATOS_SUFICIENTES. */
export function parseInsufficientInfo(
  value: unknown,
): InsufficientInfoData | null {
  const parsed = insufficientInfoSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export const isInsufficientInfo = (value: unknown): boolean =>
  parseInsufficientInfo(value) !== null;
