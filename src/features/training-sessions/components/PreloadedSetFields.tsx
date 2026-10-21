import { cn } from '../../../shared/lib/cn';
import type { SeriePrecargada } from '../../../api/trainingSessions';

export interface PreloadedSetFieldsProps {
  serie: SeriePrecargada;
  /** Valores actuales del formulario; `null` es campo vacío. */
  carga: number | null;
  repeticiones: number | null;
  onCargaChange: (carga: number | null) => void;
  onRepeticionesChange: (repeticiones: number | null) => void;
  disabled?: boolean;
}

/** Texto que explica de dónde viene el valor propuesto. */
function procedencia(serie: SeriePrecargada): string | null {
  switch (serie.origen) {
    case 'ULTIMA_EJECUCION': {
      const dias = serie.antiguedadEnDias;
      if (dias === null) return 'Tu última ejecución';
      if (dias === 0) return 'Tu última ejecución, hoy';
      if (dias === 1) return 'Tu última ejecución, ayer';
      // La antigüedad se muestra siempre junto al valor (DD-15): un dato de
      // hace dos meses no se confirma con la misma confianza que el de ayer.
      return `Tu última ejecución, hace ${String(dias)} días`;
    }
    case 'CARGA_SUGERIDA':
      return 'Carga sugerida de tu rutina';
    case 'SIN_DATOS':
      return null;
  }
}

function parseNumero(valor: string): number | null {
  if (valor.trim() === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Campos de carga y repeticiones de una serie, con los valores precargados
 * (HU22 - T2, RF-030).
 *
 * Los campos llegan completos para que confirmar la serie cueste dos
 * interacciones (RNF-07). Cuando no hay con qué precargar, el campo queda
 * **vacío y nunca en cero** (CB-09): un cero es un valor legible —RN-55 admite
 * registrar 0 kg para el peso corporal—, así que ponerlo por falta de datos
 * haría que el alumno confirme sin mirar un número que el sistema inventó.
 */
export function PreloadedSetFields({
  serie,
  carga,
  repeticiones,
  onCargaChange,
  onRepeticionesChange,
  disabled = false,
}: PreloadedSetFieldsProps) {
  const idCarga = `serie-${String(serie.position)}-carga`;
  const idReps = `serie-${String(serie.position)}-reps`;
  const fuente = procedencia(serie);

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="flex items-baseline gap-2 text-sm font-medium">
        <span>Serie {serie.position}</span>
        {serie.warmup ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-600">
            calentamiento
          </span>
        ) : null}
      </legend>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-slate-600" htmlFor={idCarga}>
            Carga (kg)
          </label>
          <input
            id={idCarga}
            type="number"
            inputMode="decimal"
            min={0}
            max={1000}
            step="0.5"
            // Campo vacío cuando no hay valor: ni `0`, ni un marcador numérico.
            value={carga === null ? '' : String(carga)}
            placeholder={serie.origen === 'SIN_DATOS' ? 'Ingresá la carga' : ''}
            onChange={(event) => {
              onCargaChange(parseNumero(event.target.value));
            }}
            className={cn(
              'rounded border px-3 py-2 text-base',
              'border-slate-300 focus:border-slate-500 focus:outline-none',
            )}
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-slate-600" htmlFor={idReps}>
            Repeticiones
          </label>
          <input
            id={idReps}
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={repeticiones === null ? '' : String(repeticiones)}
            placeholder={`${String(serie.repeticionesMinimas)}-${String(serie.repeticionesMaximas)}`}
            onChange={(event) => {
              onRepeticionesChange(parseNumero(event.target.value));
            }}
            className={cn(
              'rounded border px-3 py-2 text-base',
              'border-slate-300 focus:border-slate-500 focus:outline-none',
            )}
          />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        {fuente ?? 'Primera vez con este ejercicio: ingresá la carga.'}
        {' · '}
        <span>
          Prescripto: {serie.repeticionesMinimas}-{serie.repeticionesMaximas}{' '}
          repeticiones
        </span>
      </p>
    </fieldset>
  );
}
