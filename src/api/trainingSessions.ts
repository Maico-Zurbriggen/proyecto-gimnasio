import { z } from 'zod';

import { apiGet } from './client';

/**
 * Contrato de la precarga de series (HU22-T2), tomado de `SetPreloadDto`.
 * Escrito a mano porque el backend todavía no publica OpenAPI; reemplazar por
 * el cliente generado cuando exista.
 */

/** De dónde salió el valor precargado. */
export const origenDePrecargaSchema = z.enum([
  'ULTIMA_EJECUCION',
  'CARGA_SUGERIDA',
  'SIN_DATOS',
]);

export const seriePrecargadaSchema = z.object({
  position: z.number().int(),
  exerciseId: z.string(),
  repeticionesMinimas: z.number().int(),
  repeticionesMaximas: z.number().int(),
  warmup: z.boolean(),
  /**
   * `null` es «campo vacío»: una de las dos salidas que CB-09 autoriza cuando
   * no hay con qué precargar. Nunca llega un cero por falta de datos, y por eso
   * el tipo distingue ausencia de valor.
   */
  carga: z.number().nullable(),
  repeticiones: z.number().int().nullable(),
  origen: origenDePrecargaSchema,
  /** Días desde la ejecución que produjo el valor; `null` si no vino de una. */
  antiguedadEnDias: z.number().int().nullable(),
});

export const setPreloadSchema = z.object({
  studentId: z.string(),
  routineDayId: z.string(),
  series: z.array(seriePrecargadaSchema),
  calculadoEl: z.string(),
});

export type OrigenDePrecarga = z.infer<typeof origenDePrecargaSchema>;
export type SeriePrecargada = z.infer<typeof seriePrecargadaSchema>;
export type SetPreload = z.infer<typeof setPreloadSchema>;

/**
 * `GET /students/:studentId/routine-days/:routineDayId/set-preload`: valores
 * con los que se presenta cada serie del día (RF-030).
 */
export async function fetchSetPreload(
  studentId: string,
  routineDayId: string,
  signal?: AbortSignal,
): Promise<SetPreload> {
  const body = await apiGet(
    `/students/${studentId}/routine-days/${routineDayId}/set-preload`,
    { signal },
  );
  return setPreloadSchema.parse(body);
}
