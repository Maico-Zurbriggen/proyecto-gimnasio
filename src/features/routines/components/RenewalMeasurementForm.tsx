import { useState, type FormEvent } from 'react';

import { ApiError } from '../../../api/client';
import { parseRangeViolations } from '../../../api/measurements';
import {
  bodyMeasurementSchema,
  type BodyMeasurementInput,
} from '../../../shared/schemas/bodyMeasurement';
import { useRecordMeasurement } from '../hooks/useRecordMeasurement';

export interface RenewalMeasurementFormProps {
  studentId: string;
  /** Se invoca tras una carga correcta, para cerrar el formulario. */
  onRegistrada?: (input: BodyMeasurementInput) => void;
  onCancelar?: () => void;
}

type Campo = 'weightKg' | 'heightCm';

const VACIO: Record<Campo, string> = { weightKg: '', heightCm: '' };

/**
 * Formulario de carga de medidas desde el aviso de renovación (HU02-T3 y T4).
 *
 * La validación de rango se hace dos veces a propósito: acá, con el mismo
 * `bodyMeasurementSchema` que ya usa el desbloqueo de HU05, y del lado del
 * servidor, que es la autoridad (Esc. 1.1 y 1.2). Si el backend rechaza un valor
 * que el cliente dio por bueno, se muestra **su** mensaje, que nombra el rango
 * admitido, en lugar del genérico.
 */
export function RenewalMeasurementForm({
  studentId,
  onRegistrada,
  onCancelar,
}: RenewalMeasurementFormProps) {
  const [values, setValues] = useState<Record<Campo, string>>(VACIO);
  const [touched, setTouched] = useState<Record<Campo, boolean>>({
    weightKg: false,
    heightCm: false,
  });
  const [erroresDelServidor, setErroresDelServidor] = useState<
    Partial<Record<Campo, string>>
  >({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const mutation = useRecordMeasurement(studentId);
  const result = bodyMeasurementSchema.safeParse(values);

  const errorDeCampo = (campo: Campo): string | undefined => {
    if (erroresDelServidor[campo]) {
      return erroresDelServidor[campo];
    }
    if (!touched[campo] || result.success) {
      return undefined;
    }
    return result.error.issues.find((issue) => issue.path[0] === campo)
      ?.message;
  };

  const cambiar = (campo: Campo, valor: string) => {
    setValues((actual) => ({ ...actual, [campo]: valor }));
    // Un valor corregido deja sin vigencia el rechazo anterior del servidor.
    setErroresDelServidor((actual) => ({ ...actual, [campo]: undefined }));
    setErrorGeneral(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ weightKg: true, heightCm: true });
    setErroresDelServidor({});
    setErrorGeneral(null);

    if (!result.success) {
      return;
    }

    try {
      await mutation.mutateAsync(result.data);
      setValues(VACIO);
      setTouched({ weightKg: false, heightCm: false });
      onRegistrada?.(result.data);
    } catch (caught) {
      if (caught instanceof ApiError) {
        const violaciones = parseRangeViolations(caught.body);
        if (violaciones.length > 0) {
          setErroresDelServidor(
            Object.fromEntries(
              violaciones.map((violacion) => [
                violacion.field,
                `El valor admitido está entre ${violacion.min} y ${violacion.max} ${violacion.unit}.`,
              ]),
            ),
          );
          return;
        }
        if (caught.status === 401 || caught.status === 403) {
          setErrorGeneral('Tu sesión no permite cargar estas medidas.');
          return;
        }
      }
      setErrorGeneral('No pudimos guardar tus medidas. Probá de nuevo.');
    }
  };

  const inputClass = (invalido: boolean) =>
    `rounded-xl border px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-graphite ${
      invalido ? 'border-coral-strong' : 'border-[#292823]/15 bg-white'
    }`;

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      aria-label="Cargar medidas"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="flex flex-col gap-1.5" htmlFor="renewal-weight">
            <span className="eyebrow text-[#77756d]">Peso (kg)</span>
          </label>
          <input
            id="renewal-weight"
            type="number"
            step="0.1"
            inputMode="decimal"
            name="weightKg"
            value={values.weightKg}
            onChange={(event) => cambiar('weightKg', event.target.value)}
            onBlur={() =>
              setTouched((actual) => ({ ...actual, weightKg: true }))
            }
            aria-invalid={Boolean(errorDeCampo('weightKg'))}
            aria-describedby={
              errorDeCampo('weightKg') ? 'renewal-weight-error' : undefined
            }
            className={inputClass(Boolean(errorDeCampo('weightKg')))}
          />
          {errorDeCampo('weightKg') ? (
            <span
              id="renewal-weight-error"
              className="text-coral-strong text-xs font-medium"
              role="alert"
            >
              {errorDeCampo('weightKg')}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <label className="flex flex-col gap-1.5" htmlFor="renewal-height">
            <span className="eyebrow text-[#77756d]">Altura (cm)</span>
          </label>
          <input
            id="renewal-height"
            type="number"
            step="1"
            inputMode="numeric"
            name="heightCm"
            value={values.heightCm}
            onChange={(event) => cambiar('heightCm', event.target.value)}
            onBlur={() =>
              setTouched((actual) => ({ ...actual, heightCm: true }))
            }
            aria-invalid={Boolean(errorDeCampo('heightCm'))}
            aria-describedby={
              errorDeCampo('heightCm') ? 'renewal-height-error' : undefined
            }
            className={inputClass(Boolean(errorDeCampo('heightCm')))}
          />
          {errorDeCampo('heightCm') ? (
            <span
              id="renewal-height-error"
              className="text-coral-strong text-xs font-medium"
              role="alert"
            >
              {errorDeCampo('heightCm')}
            </span>
          ) : null}
        </div>
      </div>

      {errorGeneral ? (
        <p role="alert" className="text-coral-strong text-xs font-medium">
          {errorGeneral}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-graphite rounded-full px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {mutation.isPending ? 'Guardando…' : 'Guardar medidas'}
        </button>
        {onCancelar ? (
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-full px-3 py-2 text-xs font-semibold text-[#77756d] transition hover:text-ink"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
