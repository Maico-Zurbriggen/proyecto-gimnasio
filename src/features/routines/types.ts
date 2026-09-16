import type { AvisoRenovacion } from '../../api/routines';

/**
 * Aviso de renovación tal como lo expone `GET /routines/active` (HU01-T2).
 * Es derivado: el backend lo recalcula en cada consulta a partir de la fecha
 * de inicio del ciclo de 60 días y nunca lo persiste.
 */
export type { AvisoRenovacion };

export type EstadoAvisoRenovacion = AvisoRenovacion['estado'];
