import { useState } from 'react';

import { ApiError } from '../../../api/client';
import {
  TRAINING_PURPOSES,
  type WriteManualRoutine,
} from '../../../api/prescriptions';
import { RoutineDaysEditor } from '../../../shared/components/RoutineDaysEditor';
import {
  blankDayForm,
  dayFormsToPayload,
  validateDayForms,
  type RoutineDayForm,
} from '../../../shared/lib/routine-days';

const INPUT_CLASS =
  'w-full rounded-xl border border-[#292823]/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-graphite';

export function manualRoutineErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'pending_proposal':
        return 'El alumno ya tiene una rutina propuesta sin resolver: aprobala o rechazala antes de crear otra.';
      case 'routine_exercise_unavailable':
        return 'Un ejercicio ya no está habilitado en el gimnasio. Quitálo y elegí otro.';
      case 'student_not_found':
        return 'El alumno ya no está disponible.';
      case 'template_from_another_gym':
        return 'Hay un problema con el gimnasio del alumno.';
      case 'empty_template':
        return 'La rutina necesita al menos un día con ejercicios y series.';
      case 'invalid_request_body':
        return 'Revisá tipo, días, ejercicios, repeticiones y descansos.';
      case 'forbidden_not_assigned':
        return 'No tenés asignado a este alumno.';
      case 'forbidden_role':
        return 'Tu rol no permite crear rutinas.';
    }
  }
  return 'No pudimos crear la rutina. Intentá de nuevo en un momento.';
}

export interface ManualRoutineFormProps {
  pending: boolean;
  problems: string[];
  onSubmit: (input: WriteManualRoutine) => void;
}

/**
 * Rutina manual del entrenador para su alumno (HU16). Sin plantilla: tipo y
 * días armados directo sobre el catálogo habilitado. Nace en PROPUESTA y se
 * revisa por el flujo habitual.
 */
export function ManualRoutineForm({
  pending,
  problems,
  onSubmit,
}: ManualRoutineFormProps) {
  const [routineType, setRoutineType] =
    useState<WriteManualRoutine['routineType']>('HIPERTROFIA');
  const [days, setDays] = useState<RoutineDayForm[]>([blankDayForm()]);
  const [localProblems, setLocalProblems] = useState<string[]>([]);

  function guardar(event: React.FormEvent) {
    event.preventDefault();
    const found = validateDayForms(days);
    setLocalProblems(found);
    if (found.length > 0) return;
    onSubmit({ routineType, days: dayFormsToPayload(days) });
  }

  const allProblems = [...localProblems, ...problems];

  return (
    <form
      onSubmit={guardar}
      className="space-y-4"
      aria-label="Crear rutina manual"
    >
      <div>
        <label
          className="mb-1 block text-xs font-bold"
          htmlFor="rutina-manual-tipo"
        >
          Tipo de rutina
        </label>
        <select
          id="rutina-manual-tipo"
          className={INPUT_CLASS}
          value={routineType}
          onChange={(event) =>
            setRoutineType(
              event.target.value as WriteManualRoutine['routineType'],
            )
          }
        >
          {TRAINING_PURPOSES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {allProblems.length > 0 && (
        <ul
          className="rounded-xl border border-red-800/30 bg-red-50 px-4 py-2 text-xs text-red-900"
          role="alert"
        >
          {allProblems.map((problem) => (
            <li key={problem}>• {problem}</li>
          ))}
        </ul>
      )}

      <RoutineDaysEditor days={days} onChange={setDays} />

      <button
        type="submit"
        disabled={pending}
        className="bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? 'Creando…' : 'Crear rutina manual'}
      </button>
    </form>
  );
}
