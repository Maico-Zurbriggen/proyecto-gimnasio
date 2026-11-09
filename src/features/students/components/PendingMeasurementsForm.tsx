import { useEffect, useState } from 'react';

import {
  bodyMeasurementSchema,
  type BodyMeasurementInput,
} from '../../../shared/schemas/bodyMeasurement';

export interface PendingMeasurementsFormProps {
  /** Se invoca en cada cambio con el resultado de validación actual. */
  onValidityChange?: (
    valid: boolean,
    values: BodyMeasurementInput | null,
  ) => void;
}

interface FormState {
  weightKg: string;
  heightCm: string;
}

const EMPTY_STATE: FormState = { weightKg: '', heightCm: '' };

/**
 * Formulario de carga de las métricas adeudadas (HU05-T3), embebido en el
 * flujo de desbloqueo. Reutiliza `bodyMeasurementSchema` (la misma
 * validación de peso/altura de HU02) en lugar de reconstruirla.
 */
export function PendingMeasurementsForm({
  onValidityChange,
}: PendingMeasurementsFormProps) {
  const [values, setValues] = useState<FormState>(EMPTY_STATE);
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    weightKg: false,
    heightCm: false,
  });

  const result = bodyMeasurementSchema.safeParse({
    weightKg: values.weightKg,
    heightCm: values.heightCm,
  });

  // Solo se re-ejecuta cuando cambian los valores ingresados (no en cada
  // render por el resultado recalculado de `safeParse`).
  useEffect(() => {
    onValidityChange?.(result.success, result.success ? result.data : null);
  }, [values.weightKg, values.heightCm]);

  const fieldError = (field: keyof FormState): string | undefined => {
    if (!touched[field] || result.success) {
      return undefined;
    }
    const issue = result.error.issues.find((item) => item.path[0] === field);
    return issue?.message;
  };

  return (
    <form className="grid gap-4 sm:grid-cols-2" aria-label="Métricas adeudadas">
      <label className="flex flex-col gap-1.5">
        <span className="field-label">Peso (kg)</span>
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={values.weightKg}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              weightKg: event.target.value,
            }))
          }
          onBlur={() =>
            setTouched((current) => ({ ...current, weightKg: true }))
          }
          aria-invalid={Boolean(fieldError('weightKg'))}
          className="field"
        />
        {fieldError('weightKg') ? (
          <span className="field-error" role="alert">
            {fieldError('weightKg')}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="field-label">Altura (cm)</span>
        <input
          type="number"
          step="1"
          inputMode="numeric"
          value={values.heightCm}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              heightCm: event.target.value,
            }))
          }
          onBlur={() =>
            setTouched((current) => ({ ...current, heightCm: true }))
          }
          aria-invalid={Boolean(fieldError('heightCm'))}
          className="field"
        />
        {fieldError('heightCm') ? (
          <span className="field-error" role="alert">
            {fieldError('heightCm')}
          </span>
        ) : null}
      </label>
    </form>
  );
}
