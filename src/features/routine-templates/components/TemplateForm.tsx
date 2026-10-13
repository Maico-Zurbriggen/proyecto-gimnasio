import { useState } from 'react';

import { ApiError } from '../../../api/client';
import {
  TRAINING_PURPOSES,
  type WriteTemplate,
} from '../../../api/prescriptions';
import { RoutineDaysEditor } from '../../../shared/components/RoutineDaysEditor';
import {
  blankDayForm,
  dayFormsToPayload,
  validateDayForms,
  type RoutineDayForm,
} from '../../../shared/lib/routine-days';

export const ROUTINE_TYPES = TRAINING_PURPOSES;

const INPUT_CLASS =
  'w-full rounded-xl border border-[#292823]/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-graphite';

export type {
  RoutineDayForm as TemplateFormDay,
  RoutineExerciseForm as TemplateFormExercise,
  RoutineSetForm as TemplateFormSet,
} from '../../../shared/lib/routine-days';
export {
  blankDayForm as blankDay,
  detailToDayForms as detailToForm,
} from '../../../shared/lib/routine-days';

function validate(
  name: string,
  routineType: string,
  days: RoutineDayForm[],
): string[] {
  const problems: string[] = [];
  if (name.trim().length < 2) problems.push('La plantilla necesita un nombre.');
  if (!ROUTINE_TYPES.includes(routineType as (typeof ROUTINE_TYPES)[number]))
    problems.push('Elegí un tipo de rutina válido.');
  return [...problems, ...validateDayForms(days)];
}

export function templateErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'template_exercise_not_found':
        return 'Un ejercicio ya no está disponible en tu gimnasio. Quitálo y elegí otro del catálogo habilitado.';
      case 'template_exercise_not_approved':
        return 'Un ejercicio todavía no está aprobado. Sólo se pueden usar ejercicios aprobados.';
      case 'template_inactive':
        return 'La plantilla está desactivada. Reactivala antes de editarla.';
      case 'template_from_another_gym':
        return 'Esa plantilla es de otro gimnasio.';
      case 'template_not_found':
        return 'La plantilla ya no existe.';
      case 'invalid_request_body':
        return 'Revisá los campos: días, ejercicios, repeticiones y descansos.';
      case 'empty_template':
        return 'La plantilla necesita al menos un día con ejercicios y series.';
      case 'forbidden_role':
        return 'Tu rol no permite gestionar plantillas.';
    }
  }
  return 'No pudimos guardar la plantilla. Intentá de nuevo en un momento.';
}

export interface TemplateFormProps {
  initialName?: string;
  initialType?: WriteTemplate['routineType'];
  initialDays?: RoutineDayForm[];
  submitLabel: string;
  pending: boolean;
  problems: string[];
  onSubmit: (input: WriteTemplate) => void;
}

export function TemplateForm({
  initialName = '',
  initialType = 'HIPERTROFIA',
  initialDays,
  submitLabel,
  pending,
  problems,
  onSubmit,
}: TemplateFormProps) {
  const [name, setName] = useState(initialName);
  const [routineType, setRoutineType] =
    useState<WriteTemplate['routineType']>(initialType);
  const [days, setDays] = useState<RoutineDayForm[]>(
    initialDays ?? [blankDayForm()],
  );
  const [localProblems, setLocalProblems] = useState<string[]>([]);

  function guardar(event: React.FormEvent) {
    event.preventDefault();
    const found = validate(name, routineType, days);
    setLocalProblems(found);
    if (found.length > 0) return;
    onSubmit({ name: name.trim(), routineType, days: dayFormsToPayload(days) });
  }

  const allProblems = [...localProblems, ...problems];

  return (
    <form onSubmit={guardar} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            className="mb-1 block text-xs font-bold"
            htmlFor="plantilla-nombre"
          >
            Nombre de la plantilla
          </label>
          <input
            id="plantilla-nombre"
            className={INPUT_CLASS}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            placeholder="p. ej. Hipertrofia 3 días"
          />
        </div>
        <div>
          <label
            className="mb-1 block text-xs font-bold"
            htmlFor="plantilla-tipo"
          >
            Tipo de rutina
          </label>
          <select
            id="plantilla-tipo"
            className={INPUT_CLASS}
            value={routineType}
            onChange={(event) =>
              setRoutineType(event.target.value as WriteTemplate['routineType'])
            }
          >
            {ROUTINE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
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

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
