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

  const inputClass = (invalid: boolean) =>
    `rounded-xl border px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-graphite ${
      invalid ? 'border-coral-strong' : 'border-[#292823]/15 bg-white'
    }`;

  return (
    <form
      className="flex flex-col gap-4 sm:flex-row"
      aria-label="Métricas adeudadas"
    >
      <label className="flex flex-1 flex-col gap-1.5">
        <span className="eyebrow text-[#77756d]">Peso (kg)</span>
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
          className={inputClass(Boolean(fieldError('weightKg')))}
        />
        {fieldError('weightKg') ? (
          <span className="text-xs font-medium text-coral-strong" role="alert">
            {fieldError('weightKg')}
          </span>
        ) : null}
      </label>

      <label className="flex flex-1 flex-col gap-1.5">
        <span className="eyebrow text-[#77756d]">Altura (cm)</span>
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
          className={inputClass(Boolean(fieldError('heightCm')))}
        />
        {fieldError('heightCm') ? (
          <span className="text-xs font-medium text-coral-strong" role="alert">
            {fieldError('heightCm')}
          </span>
        ) : null}
      </label>
    </form>
  );
}
