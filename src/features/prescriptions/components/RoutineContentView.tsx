import { ChevronDown } from 'lucide-react';

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
      <span className={incompatible ? 'chip-danger' : 'chip-warn'}>
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
    <div className="space-y-4">
      {routine.generationExplanation && (
        <section className="surface-muted text-sm">
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
        {routine.days.map((day, index) => {
          const alerts = day.exercises.filter(
            (exercise) =>
              exercise.available === false ||
              exercise.compatibilityState === 'ADVERTIDO' ||
              exercise.compatibilityState === 'INCOMPATIBLE',
          ).length;
          return (
            <li key={day.position}>
              {/* Plegable nativo: el primer día abierto, el resto se ve por su resumen. */}
              <details
                open={index === 0}
                className="group rounded-2xl border border-[#292823]/8 bg-white transition hover:border-[#292823]/20 open:shadow-[0_12px_32px_-22px_rgb(20_20_18/0.25)]"
              >
                <summary className="flex cursor-pointer list-none items-start gap-3 rounded-2xl p-4 transition hover:bg-[#faf9f4] sm:p-5 [&::-webkit-details-marker]:hidden">
                  <span
                    aria-hidden="true"
                    className="font-display flex size-9 shrink-0 items-center justify-center rounded-xl bg-graphite text-sm font-bold text-lime"
                  >
                    {day.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-base font-bold tracking-[-0.03em]">
                      Día {day.position} · {day.name}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="chip-neutral">
                        {patternLabel(day.dominantPattern)}
                      </span>
                      <span className="chip-neutral">
                        {day.exercises.length}{' '}
                        {day.exercises.length === 1
                          ? 'ejercicio'
                          : 'ejercicios'}
                      </span>
                      {alerts > 0 ? (
                        <span className="chip-warn">
                          {alerts} {alerts === 1 ? 'alerta' : 'alertas'}
                        </span>
                      ) : null}
                    </div>
                    {/* Adelanto del día cerrado. Va por CSS para no duplicar los nombres como texto. */}
                    <p
                      data-preview={day.exercises
                        .map((exercise) => exercise.exerciseName)
                        .join(' · ')}
                      className="mt-2 truncate text-xs text-[#77756d] group-open:hidden before:content-[attr(data-preview)]"
                    />
                  </div>
                  <ChevronDown
                    aria-hidden="true"
                    className="mt-2 size-4 shrink-0 text-[#77756d] transition group-open:rotate-180"
                  />
                </summary>

                <ul className="flex flex-col gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
                  {day.exercises.map((exercise) => (
                    <li
                      key={exercise.position}
                      className="rounded-2xl border border-[#292823]/8 bg-white/70 p-4 text-sm"
                    >
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
                          className="mt-1 text-xs font-medium text-[#b23f2f]"
                        >
                          Este ejercicio ya no está disponible en el gimnasio.
                          Requiere revisión del entrenador.
                        </p>
                      )}
                      {exercise.sets.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-2 text-xs text-[#55534c]">
                          {exercise.sets.map((set) => (
                            <li
                              key={set.position}
                              className="inline-flex items-center rounded-full border border-[#292823]/15 bg-white px-3 py-1"
                            >
                              Serie {set.position}
                              {set.warmup ? ' (entrada en calor)' : ''}:{' '}
                              {setLine(set)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-[#77756d]">
                          Sin series prescriptas.
                        </p>
                      )}
                      {exercise.note ? (
                        <p className="mt-2 text-xs font-medium text-[#77756d]">
                          Nota: {exercise.note}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
