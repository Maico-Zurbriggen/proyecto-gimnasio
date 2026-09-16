import type { ProposalAdjustment } from '../../../api/proposals';

type AdjustmentType = ProposalAdjustment['type'];

const TYPE_LABEL: Record<AdjustmentType, string> = {
  CARGA: 'Carga',
  VOLUMEN: 'Volumen',
  ESQUEMA: 'Esquema',
  SUSTITUCION: 'Sustitución',
  ESTRUCTURA: 'Estructura',
};

export function adjustmentTypeLabel(type: AdjustmentType): string {
  return TYPE_LABEL[type];
}

function field(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

/**
 * Texto legible de `previousValue`/`proposedValue`, con los mismos formatos que
 * aplica el backend al generar la versión nueva. Lo desconocido se muestra crudo.
 */
export function formatAdjustmentValue(
  type: AdjustmentType,
  value: unknown,
): string {
  switch (type) {
    case 'CARGA': {
      const load = field(value, 'carga_sugerida');
      if (typeof load === 'number') {
        return `${load.toLocaleString('es-AR')} kg`;
      }
      break;
    }
    case 'ESQUEMA': {
      const min = field(value, 'min_repetitions');
      const max = field(value, 'max_repetitions');
      if (typeof min === 'number' && typeof max === 'number') {
        return `${min}–${max} reps`;
      }
      break;
    }
    case 'VOLUMEN': {
      const sets = field(value, 'series_trabajo');
      if (typeof sets === 'number') {
        return `${sets} ${sets === 1 ? 'serie' : 'series'}`;
      }
      break;
    }
    case 'SUSTITUCION': {
      const exercise =
        field(value, 'exercise_name') ?? field(value, 'exercise_id');
      if (typeof exercise === 'string') {
        return exercise;
      }
      break;
    }
    case 'ESTRUCTURA':
      break;
  }
  return JSON.stringify(value);
}
