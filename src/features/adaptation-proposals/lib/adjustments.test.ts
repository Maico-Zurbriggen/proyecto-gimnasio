import { describe, expect, it } from 'vitest';

import { adjustmentTypeLabel, formatAdjustmentValue } from './adjustments';

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

  it('muestra crudo lo que no reconoce', () => {
    expect(formatAdjustmentValue('ESTRUCTURA', { dias: 4 })).toBe('{"dias":4}');
  });

  it('traduce el tipo de ajuste', () => {
    expect(adjustmentTypeLabel('SUSTITUCION')).toBe('Sustitución');
  });
});
