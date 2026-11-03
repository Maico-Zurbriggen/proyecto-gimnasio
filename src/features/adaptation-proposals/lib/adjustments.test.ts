import { describe, expect, it } from 'vitest';

import {
  adjustmentTypeLabel,
  criterionLabel,
  formatAdjustmentValue,
} from './adjustments';

describe('formatAdjustmentValue', () => {
  it('formatea los valores con el mismo formato que usa el backend', () => {
    expect(formatAdjustmentValue('CARGA', { carga_sugerida: 62.5 })).toBe(
      '62,5 kg',
    );
    expect(
      formatAdjustmentValue('ESQUEMA', {
        min_repetitions: 4,
        max_repetitions: 6,
      }),
    ).toBe('4–6 reps');
    expect(formatAdjustmentValue('VOLUMEN', { series_trabajo: 1 })).toBe(
      '1 serie',
    );
    expect(formatAdjustmentValue('VOLUMEN', { series_trabajo: 4 })).toBe(
      '4 series',
    );
  });

  it('no expone JSON cuando no reconoce el formato interno', () => {
    expect(formatAdjustmentValue('ESTRUCTURA', { dias: 4 })).toBe(
      'Cambio en la organización de la rutina',
    );
  });

  it('traduce el tipo de ajuste', () => {
    expect(adjustmentTypeLabel('SUSTITUCION')).toBe('Sustitución');
    expect(adjustmentTypeLabel('ESQUEMA')).toBe('Rango de repeticiones');
  });
});

describe('criterionLabel', () => {
  it('traduce los criterios de la tabla situación → ajuste', () => {
    expect(criterionLabel('ESTIMULO_INSUFICIENTE')).toBe(
      'Estímulo insuficiente',
    );
    expect(criterionLabel('ESTANCAMIENTO_SEGUNDO_CONSECUTIVO')).toMatch(
      /segundo diagnóstico consecutivo/,
    );
  });

  it('conserva el criterio funcional y oculta referencias internas', () => {
    expect(criterionLabel('Texto libre (RN-79a).')).toBe('Texto libre');
  });
});

describe('ajustes de estructura de la tabla', () => {
  it('formatea frecuencia, agregado de ejercicio y cambio de tipo', () => {
    expect(
      formatAdjustmentValue('ESTRUCTURA', { target_weekly_frequency: 3 }),
    ).toBe('3 días por semana');
    expect(
      formatAdjustmentValue('ESTRUCTURA', {
        action: 'AGREGAR_EJERCICIO',
        movement_pattern: 'TRACCION_HORIZONTAL',
      }),
    ).toBe('Agregar un ejercicio de Traccion horizontal');
    expect(
      formatAdjustmentValue('ESTRUCTURA', { routine_type: 'FUERZA' }),
    ).toBe('Fuerza');
  });
});
