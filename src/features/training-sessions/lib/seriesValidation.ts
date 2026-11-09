/**
 * Validación local al guardar (RN-55 + CHECK de completitud).
 * Guardar siempre marca la serie como completada, así que la carga y las
 * repeticiones ejecutadas son obligatorias; el esfuerzo es opcional.
 * Evita el ida y vuelta y explica el campo exacto antes de enviar.
 */
export interface SeriesFieldErrors {
  load?: string;
  reps?: string;
  effort?: string;
}

export function validateSeriesFields(input: {
  load: string;
  reps: string;
  effort: string;
}): SeriesFieldErrors {
  const errors: SeriesFieldErrors = {};
  if (input.load === '') {
    errors.load = 'Completá la carga para guardar la serie.';
  } else {
    const value = Number(input.load);
    if (!Number.isFinite(value) || value < 0 || value > 1000) {
      errors.load = 'La carga debe estar entre 0 y 1000 kg.';
    }
  }
  if (input.reps === '') {
    errors.reps = 'Completá las repeticiones para guardar la serie.';
  } else {
    const value = Number(input.reps);
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      errors.reps = 'Las repeticiones deben estar entre 1 y 100.';
    }
  }
  if (input.effort !== '') {
    const value = Number(input.effort);
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      errors.effort = 'El esfuerzo debe estar entre 1 y 10.';
    }
  }
  return errors;
}

export function hasSeriesFieldErrors(errors: SeriesFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
