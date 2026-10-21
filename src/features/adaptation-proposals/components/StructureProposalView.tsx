import { z } from 'zod';

import { routineContentSchema } from '../../../api/prescriptions';
import { generationSettingsSnapshotSchema } from '../../../api/generated/generation-management';
import { formatDate, humanizeEnum } from '../../../shared/lib/format';
import { RoutineContentView } from '../../prescriptions/components/RoutineContentView';

const structureSchema = routineContentSchema.pick({ days: true }).extend({
  routineType: z.string(),
  targetWeeklyFrequency: z.number().int(),
  generationSettings: generationSettingsSnapshotSchema.nullable().optional(),
  sourceExerciseNames: z.record(z.string(), z.string()).optional(),
});
const evidenceSchema = z.object({
  estructuraVigente: z
    .object({
      days: z.array(
        z.object({
          position: z.number(),
          name: z.string(),
          exercises: z.array(
            z.object({
              exerciseId: z.string(),
              exerciseName: z.string().optional(),
            }),
          ),
        }),
      ),
    })
    .optional(),
  mediciones: z
    .array(
      z.object({
        type: z.string(),
        value: z.number(),
        measuredOn: z.string(),
      }),
    )
    .optional(),
});

export function StructureProposalView({
  value,
  evidence,
}: {
  value: unknown;
  evidence: unknown;
}) {
  const candidate = structureSchema.safeParse(value);
  if (!candidate.success) return null;
  const captured = evidenceSchema.safeParse(evidence);
  const source = captured.success ? captured.data.estructuraVigente : undefined;
  const measurements = captured.success ? captured.data.mediciones : undefined;
  const movements = new Map<
    string,
    { name: string; before: string[]; after: string[] }
  >();
  for (const day of candidate.data.days) {
    for (const exercise of day.exercises) {
      const move = movements.get(exercise.exerciseId) ?? {
        name: exercise.exerciseName,
        before: [],
        after: [],
      };
      move.after.push(day.name);
      movements.set(exercise.exerciseId, move);
    }
  }
  for (const day of source?.days ?? []) {
    for (const exercise of day.exercises) {
      const movement = movements.get(exercise.exerciseId) ?? {
        name:
          exercise.exerciseName ??
          candidate.data.sourceExerciseNames?.[exercise.exerciseId] ??
          exercise.exerciseId,
        before: [],
        after: [],
      };
      movement.before.push(day.name);
      movements.set(exercise.exerciseId, movement);
    }
  }
  const settings = candidate.data.generationSettings?.settings;

  return (
    <section className="mt-4 space-y-4" aria-label="Planilla de renovación">
      <h3 className="font-display text-lg font-semibold tracking-tight">
        Planilla propuesta por IA
      </h3>
      <p className="text-sm text-[#68675f]">
        {humanizeEnum(candidate.data.routineType)} ·{' '}
        {candidate.data.targetWeeklyFrequency} días por semana.
      </p>
      {settings ? (
        <p className="surface-muted text-xs">
          Parámetros del gimnasio usados: {settings.minExercisesPerDay}–
          {settings.maxExercisesPerDay} ejercicios por día ·{' '}
          {settings.minWorkSetsPerExercise}–{settings.maxWorkSetsPerExercise}{' '}
          series de trabajo por ejercicio · {settings.minRepetitions}–
          {settings.maxRepetitions} repeticiones · {settings.minRestSeconds}–
          {settings.maxRestSeconds}s de descanso ·{' '}
          {settings.warmupSetsPerExercise} series de calentamiento.
        </p>
      ) : null}
      {source ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="mb-2 text-left font-semibold">
              Distribución vigente y propuesta
            </caption>
            <thead>
              <tr>
                <th className="p-2">Ejercicio</th>
                <th className="p-2">Antes</th>
                <th className="p-2">Propuesta</th>
              </tr>
            </thead>
            <tbody>
              {[...movements.entries()].map(([id, move]) => (
                <tr key={id} className="border-t border-[#292823]/10">
                  <td className="p-2 font-semibold">{move.name}</td>
                  <td className="p-2">
                    {move.before.join(' · ') ||
                      'Sin aparición en la versión de origen'}
                  </td>
                  <td className="p-2">
                    {move.after.join(' · ') || 'Quitado de la propuesta'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <RoutineContentView routine={candidate.data} />
      {measurements ? (
        <section className="surface-muted text-xs">
          <h3 className="font-semibold">
            Mediciones que sustentan la renovación
          </h3>
          {measurements.length ? (
            <ul className="mt-2 space-y-1">
              {measurements.map((measurement, index) => (
                <li key={index}>
                  {humanizeEnum(measurement.type)}:{' '}
                  {measurement.value.toLocaleString('es-AR')}
                  {measurement.type === 'PESO_CORPORAL'
                    ? ' kg'
                    : measurement.type.startsWith('PERIMETRO_')
                      ? ' cm'
                      : ''}{' '}
                  · {formatDate(measurement.measuredOn)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">
              Sin medición corporal posterior al inicio y hasta el cierre del
              ciclo.
            </p>
          )}
        </section>
      ) : null}
    </section>
  );
}
