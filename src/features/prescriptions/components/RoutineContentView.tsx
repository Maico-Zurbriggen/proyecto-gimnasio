import type { PrescribedSet, RoutineContent } from '../../../api/prescriptions';

/** Nombres legibles de los patrones de movimiento del glosario. */
const PATRONES: Record<string, string> = {
  EMPUJE_HORIZONTAL: 'Empuje horizontal',
  EMPUJE_VERTICAL: 'Empuje vertical',
  TRACCION_HORIZONTAL: 'Tracción horizontal',
  TRACCION_VERTICAL: 'Tracción vertical',
  DOMINANTE_RODILLA: 'Dominante de rodilla',
  DOMINANTE_CADERA: 'Dominante de cadera',
  CORE: 'Core',
  AISLAMIENTO_SUPERIOR: 'Aislamiento superior',
  AISLAMIENTO_INFERIOR: 'Aislamiento inferior',
};

export function patternLabel(pattern: string): string {
  return PATRONES[pattern] ?? pattern;
}

/** Series de un ejercicio, en una línea por serie. */
function setLine(set: PrescribedSet): string {
  const repeticiones =
    set.minRepetitions === set.maxRepetitions
      ? `${String(set.minRepetitions)} rep`
      : `${String(set.minRepetitions)}-${String(set.maxRepetitions)} rep`;
  const carga =
    set.suggestedLoad === null
      ? 'carga a definir'
      : set.suggestedLoad > 0
        ? `${String(set.suggestedLoad)} kg`
        : 'peso corporal';
  return `${repeticiones} · ${carga} · ${String(set.restSeconds)}s de descanso`;
}

type Exercise = RoutineContent['days'][number]['exercises'][number];

/**
 * Compatibilidad del ejercicio con las condiciones del alumno (HU11 - criterio
 * front 13). La calcula el backend; acá sólo se muestra, con texto además del
 * color.
 */
function CompatibilityNotice({
  state,
  reason,
}: {
  state: Exercise['compatibilityState'];
  reason: Exercise['compatibilityReason'];
}) {
  if (state !== 'ADVERTIDO' && state !== 'INCOMPATIBLE') return null;
  const incompatible = state === 'INCOMPATIBLE';
  return (
    <p
      className={`mt-1 flex flex-wrap items-center gap-1.5 text-xs ${incompatible ? 'text-[#7a2a20]' : 'text-[#5a3d0c]'}`}
    >
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${incompatible ? 'bg-[#fbe7e5]' : 'bg-[#fdf3e0]'}`}
      >
        {incompatible ? 'Incompatible' : 'Advertencia'}
      </span>
      {reason ??
        (incompatible
          ? 'Compromete una zona con una condición declarada.'
          : 'Involucra una zona con una condición leve.')}
    </p>
  );
}

export interface RoutineContentViewProps {
  routine: Pick<
    RoutineContent,
    'days' | 'generationExplanation' | 'generationWarnings'
  >;
}

/**
 * Días, ejercicios y series de una rutina. La usan las dos pantallas: la
 * revisión del entrenador y la vista del alumno, para que ambos vean
 * exactamente lo mismo.
 */
export function RoutineContentView({ routine }: RoutineContentViewProps) {
  return (
    <div className="space-y-3">
      {routine.generationExplanation && (
        <section className="rounded-xl bg-[#eef1e4] p-4 text-sm">
          <h3 className="font-semibold">Criterio de la propuesta de IA</h3>
          <p className="mt-2">{routine.generationExplanation}</p>
          {routine.generationWarnings?.length ? (
            <ul className="mt-2 list-disc pl-5">
              {routine.generationWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </section>
      )}
      <ol className="flex flex-col gap-3">
        {routine.days.map((day) => (
          <li
            key={day.position}
            className="rounded-xl border border-[#292823]/10 bg-white p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-base font-bold tracking-[-0.03em]">
                Día {day.position} · {day.name}
              </h3>
              <span className="eyebrow text-[#77756d]">
                {patternLabel(day.dominantPattern)}
              </span>
            </div>

            <ul className="mt-3 flex flex-col gap-2.5">
              {day.exercises.map((exercise) => (
                <li key={exercise.position} className="text-sm">
                  <p className="font-semibold">
                    {exercise.position}. {exercise.exerciseName}
                  </p>
                  <CompatibilityNotice
                    state={exercise.compatibilityState}
                    reason={exercise.compatibilityReason}
                  />
                  {exercise.available === false && (
                    <p
                      role="status"
                      className="mt-1 text-xs font-medium text-red-800"
                    >
                      Este ejercicio ya no está disponible en el gimnasio.
                      Requiere revisión del entrenador.
                    </p>
                  )}
                  {exercise.sets.length > 0 ? (
                    <ul className="mt-1 flex flex-col gap-0.5 pl-4 text-xs text-[#55534c]">
                      {exercise.sets.map((set) => (
                        <li key={set.position}>
                          Serie {set.position}
                          {set.warmup ? ' (entrada en calor)' : ''}:{' '}
                          {setLine(set)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 pl-4 text-xs text-[#77756d]">
                      Sin series prescriptas.
                    </p>
                  )}
                  {exercise.note ? (
                    <p className="mt-1 pl-4 text-xs font-medium text-[#77756d]">
                      Nota: {exercise.note}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
