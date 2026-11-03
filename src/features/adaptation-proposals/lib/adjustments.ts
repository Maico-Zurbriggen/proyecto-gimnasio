import type { ProposalAdjustment } from '../../../api/proposals';
import { humanizeEnum } from '../../../shared/lib/format';

type AdjustmentType = ProposalAdjustment['type'];

const TYPE_LABEL: Record<AdjustmentType, string> = {
  CARGA: 'Carga',
  VOLUMEN: 'Volumen',
  ESQUEMA: 'Rango de repeticiones',
  SUSTITUCION: 'Sustitución',
  ESTRUCTURA: 'Organización de la rutina',
};

const CRITERION_LABEL: Record<string, string> = {
  ESTIMULO_INSUFICIENTE: 'Estímulo insuficiente',
  ESTANCAMIENTO_PRIMERO: 'Estancamiento (primer diagnóstico)',
  ESTANCAMIENTO_SEGUNDO_CONSECUTIVO:
    'Estancamiento (segundo diagnóstico consecutivo)',
  SOBREEXIGENCIA: 'Sobreexigencia',
  INCOMPATIBLE: 'Ejercicio incompatible con el alumno',
  EJERCICIO_DESACTIVADO: 'Ejercicio desactivado en el gimnasio',
  ADHERENCIA_BAJA_SOSTENIDA:
    'Adherencia baja sostenida (menos de 60 % durante 4 semanas)',
  DESBALANCE_POR_DEFECTO: 'Desbalance muscular por defecto',
  DESBALANCE_POR_EXCESO: 'Desbalance muscular por exceso',
  CAMBIO_OBJETIVO: 'Cambio de objetivo',
};

/** Criterio de la tabla situación → ajuste en palabras; lo desconocido se muestra crudo. */
export function criterionLabel(criterion: string): string {
  const label = CRITERION_LABEL[criterion] ?? criterion;
  return label
    .replace(/\s*\((?:RN|RF|RNF|RA|RI|CB|DD|PD|S)-[^)]*\)\.?/giu, '')
    .trim();
}

export function adjustmentTypeLabel(type: AdjustmentType): string {
  return TYPE_LABEL[type];
}

export function requiresManualIntervention(
  adjustment: ProposalAdjustment,
): boolean {
  return (
    field(adjustment.proposedValue, 'requires_manual_intervention') === true
  );
}

function field(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

/**
 * Texto legible de `previousValue`/`proposedValue`, con los mismos formatos que
 * aplica el backend al generar la versión nueva. Los formatos internos no se
 * exponen: si falta un presentador específico, se explica el tipo de cambio.
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
      if (field(value, 'requires_manual_intervention') === true) {
        return 'Selección manual requerida';
      }
      const exercise =
        field(value, 'exercise_name') ?? field(value, 'exercise_id');
      if (typeof exercise === 'string') {
        return exercise;
      }
      break;
    }
    case 'ESTRUCTURA': {
      const routineType =
        field(value, 'routineType') ?? field(value, 'routine_type');
      const frequency =
        field(value, 'targetWeeklyFrequency') ??
        field(value, 'target_weekly_frequency');
      if (typeof routineType === 'string' && typeof frequency === 'number') {
        return `${humanizeEnum(routineType)} · ${frequency} días por semana`;
      }
      if (field(value, 'action') === 'AGREGAR_EJERCICIO') {
        const pattern = field(value, 'movement_pattern');
        return typeof pattern === 'string'
          ? `Agregar un ejercicio de ${humanizeEnum(pattern)}`
          : 'Agregar un ejercicio';
      }
      if (typeof frequency === 'number') {
        return `${frequency} días por semana`;
      }
      if (typeof routineType === 'string') {
        return humanizeEnum(routineType);
      }
      const muscleGroup = field(value, 'muscle_group');
      if (typeof muscleGroup === 'string') {
        return humanizeEnum(muscleGroup);
      }
      break;
    }
  }
  const fallback: Record<AdjustmentType, string> = {
    CARGA: 'Cambio de carga propuesto',
    VOLUMEN: 'Cambio en la cantidad de series',
    ESQUEMA: 'Cambio en el rango de repeticiones',
    SUSTITUCION: 'Cambio de ejercicio propuesto',
    ESTRUCTURA: 'Cambio en la organización de la rutina',
  };
  return fallback[type];
}
