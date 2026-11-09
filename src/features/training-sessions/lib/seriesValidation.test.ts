import { describe, expect, it } from 'vitest';

import { hasSeriesFieldErrors, validateSeriesFields } from './seriesValidation';

describe('validateSeriesFields (RN-55)', () => {
  it('acepta valores dentro de rango', () => {
    expect(
      hasSeriesFieldErrors(
        validateSeriesFields({ load: '20.5', reps: '10', effort: '7' }),
      ),
    ).toBe(false);
    expect(
      hasSeriesFieldErrors(
        validateSeriesFields({ load: '20', reps: '10', effort: '' }),
      ),
    ).toBe(false);
  });

  it('exige carga y repeticiones para guardar como completada', () => {
    const errors = validateSeriesFields({ load: '', reps: '', effort: '' });
    expect(errors.load).toMatch(/Completá la carga/);
    expect(errors.reps).toMatch(/Completá las repeticiones/);
    expect(errors.effort).toBeUndefined();
    expect(hasSeriesFieldErrors(errors)).toBe(true);
  });

  it('rechaza cada campo fuera de rango con su mensaje', () => {
    const errors = validateSeriesFields({
      load: '1000.01',
      reps: '101',
      effort: '11',
    });
    expect(errors.load).toMatch(/0 y 1000/);
    expect(errors.reps).toMatch(/1 y 100/);
    expect(errors.effort).toMatch(/1 y 10/);
    expect(hasSeriesFieldErrors(errors)).toBe(true);
  });

  it('rechaza negativos y no enteros donde corresponde', () => {
    expect(
      validateSeriesFields({ load: '-1', reps: '', effort: '' }).load,
    ).toBeDefined();
    expect(
      validateSeriesFields({ load: '', reps: '10.5', effort: '' }).reps,
    ).toBeDefined();
    expect(
      validateSeriesFields({ load: '', reps: '', effort: '0' }).effort,
    ).toBeDefined();
  });
});
