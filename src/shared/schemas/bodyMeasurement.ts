import { z } from 'zod';

/**
 * Rango fisiológico admitido para peso y altura (RN-15/16/17 del dominio, HU02).
 * Única fuente de validación de estos dos campos en el frontend: cualquier
 * formulario que cargue peso/altura (carga de renovación en HU02, o el
 * formulario de métricas adeudadas en el desbloqueo de HU05) debe importar
 * este esquema en lugar de redefinir los límites.
 */
export const WEIGHT_KG_RANGE = { min: 20.0, max: 250.0 } as const;
export const HEIGHT_CM_RANGE = { min: 100, max: 250 } as const;

export const bodyMeasurementSchema = z.object({
  weightKg: z.coerce
    .number({ error: 'Ingresá un peso válido.' })
    .min(
      WEIGHT_KG_RANGE.min,
      `El peso debe estar entre ${WEIGHT_KG_RANGE.min} y ${WEIGHT_KG_RANGE.max} kg.`,
    )
    .max(
      WEIGHT_KG_RANGE.max,
      `El peso debe estar entre ${WEIGHT_KG_RANGE.min} y ${WEIGHT_KG_RANGE.max} kg.`,
    ),
  heightCm: z.coerce
    .number({ error: 'Ingresá una altura válida.' })
    .min(
      HEIGHT_CM_RANGE.min,
      `La altura debe estar entre ${HEIGHT_CM_RANGE.min} y ${HEIGHT_CM_RANGE.max} cm.`,
    )
    .max(
      HEIGHT_CM_RANGE.max,
      `La altura debe estar entre ${HEIGHT_CM_RANGE.min} y ${HEIGHT_CM_RANGE.max} cm.`,
    ),
});

export type BodyMeasurementInput = z.infer<typeof bodyMeasurementSchema>;
