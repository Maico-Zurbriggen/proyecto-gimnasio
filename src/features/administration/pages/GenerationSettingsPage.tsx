import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../api/client';
import {
  fetchGenerationSettings,
  saveGenerationSettings,
  type GenerationSettings,
} from '../../../api/generation-settings';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { BentoCard } from '../../../shared/ui/BentoCard';

const initialDraft: GenerationSettings = {
  minExercisesPerDay: 4,
  maxExercisesPerDay: 6,
  minWorkSetsPerExercise: 3,
  maxWorkSetsPerExercise: 4,
  minRepetitions: 8,
  maxRepetitions: 12,
  minRestSeconds: 60,
  maxRestSeconds: 120,
  warmupSetsPerExercise: 0,
};
const ranges = [
  ['Ejercicios por día', 'minExercisesPerDay', 'maxExercisesPerDay', 1, 20],
  [
    'Series de trabajo por ejercicio',
    'minWorkSetsPerExercise',
    'maxWorkSetsPerExercise',
    1,
    10,
  ],
  ['Repeticiones por serie', 'minRepetitions', 'maxRepetitions', 1, 100],
  [
    'Descanso entre series (segundos)',
    'minRestSeconds',
    'maxRestSeconds',
    0,
    1800,
  ],
] as const;

function errorMessage(error: unknown) {
  if (
    error instanceof ApiError &&
    error.code === 'generation_settings_conflict'
  )
    return 'La configuración cambió en otra sesión. Recargá los parámetros antes de guardar.';
  if (
    error instanceof ApiError &&
    error.code === 'generation_settings_exceed_capacity'
  )
    return 'Reducí el máximo de ejercicios o series: una planilla de siete días debe caber en 500 series totales.';
  if (error instanceof ApiError && error.code === 'invalid_generation_settings')
    return 'Revisá los valores: cada mínimo debe ser menor o igual que su máximo.';
  return 'No se pudieron guardar los parámetros. Intentá nuevamente.';
}

export function GenerationSettingsPage() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['generation-settings'],
    queryFn: ({ signal }) => fetchGenerationSettings(signal),
  });
  const [draft, setDraft] = useState(initialDraft);
  const [enabled, setEnabled] = useState(false);
  const mutation = useMutation({
    mutationFn: saveGenerationSettings,
    onSuccess: (data) => client.setQueryData(['generation-settings'], data),
  });
  useEffect(() => {
    if (query.data) {
      setEnabled(query.data.settings !== null);
      setDraft(query.data.settings ?? initialDraft);
    }
  }, [query.data]);
  return (
    <div>
      <PageHeader
        kicker="Configuración del gimnasio"
        title="Parámetros de generación con IA"
        description="Se aplican a las nuevas planillas, renovaciones automáticas y regeneraciones. El entrenador revisa cada propuesta antes de ponerla en vigencia."
      />
      <main className="px-4 pb-10 sm:px-7 lg:px-9">
        <BentoCard>
          {query.isPending ? (
            <p role="status">Cargando parámetros…</p>
          ) : query.error ? (
            <div>
              <p role="alert">No pudimos cargar la configuración.</p>
              <button onClick={() => void query.refetch()}>Reintentar</button>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate({
                  settings: enabled ? draft : null,
                  revision: query.data.revision,
                });
              }}
            >
              <label className="flex items-center gap-3 font-semibold">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => {
                    setEnabled(event.target.checked);
                    mutation.reset();
                  }}
                />
                Usar parámetros definidos por el gimnasio
              </label>
              <p className="mt-2 text-sm text-[#77756d]">
                Sin parámetros guardados, la IA decide la prescripción según el
                alumno. Los ejercicios siempre salen del catálogo aprobado y
                habilitado del gimnasio.
              </p>
              <fieldset
                disabled={!enabled || mutation.isPending}
                className="mt-6 grid gap-5 sm:grid-cols-2"
              >
                {ranges.map(([label, minimum, maximum, lower, upper]) => (
                  <div key={minimum}>
                    <p className="mb-2 text-sm font-bold">{label}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {([minimum, maximum] as const).map((key, index) => (
                        <label key={key} className="text-xs">
                          {index === 0 ? 'Mínimo' : 'Máximo'}
                          <input
                            aria-label={`${label}: ${index === 0 ? 'mínimo' : 'máximo'}`}
                            type="number"
                            required
                            min={lower}
                            max={upper}
                            step={1}
                            value={draft[key]}
                            onChange={(event) => {
                              setDraft({
                                ...draft,
                                [key]: event.target.valueAsNumber,
                              });
                              mutation.reset();
                            }}
                            className="mt-1 block w-full rounded-xl border border-[#292823]/20 bg-white p-3 text-sm disabled:bg-[#efeee7]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <label className="text-sm font-bold">
                  Series de calentamiento por ejercicio
                  <input
                    aria-label="Series de calentamiento por ejercicio"
                    type="number"
                    required
                    min={0}
                    max={5}
                    step={1}
                    value={draft.warmupSetsPerExercise}
                    onChange={(event) => {
                      setDraft({
                        ...draft,
                        warmupSetsPerExercise: event.target.valueAsNumber,
                      });
                      mutation.reset();
                    }}
                    className="mt-2 block w-full rounded-xl border border-[#292823]/20 bg-white p-3 text-sm disabled:bg-[#efeee7]"
                  />
                  <span className="mt-1 block text-xs font-normal text-[#77756d]">
                    Cantidad exacta, adicional a las series de trabajo. Los
                    rangos de repeticiones y descanso se aplican a todas las
                    series.
                  </span>
                </label>
              </fieldset>
              {mutation.error ? (
                <p role="alert" className="mt-4 text-sm text-[#7a2a20]">
                  {errorMessage(mutation.error)}
                </p>
              ) : null}
              {mutation.isSuccess ? (
                <p role="status" className="mt-4 text-sm">
                  Parámetros guardados. Se usarán en las próximas generaciones.
                </p>
              ) : null}
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="rounded-full bg-lime px-5 py-3 text-sm font-bold disabled:opacity-50"
                >
                  {mutation.isPending ? 'Guardando…' : 'Guardar parámetros'}
                </button>
                {mutation.error instanceof ApiError &&
                mutation.error.status === 409 ? (
                  <button
                    type="button"
                    onClick={() => void query.refetch()}
                    className="text-sm underline"
                  >
                    Recargar parámetros
                  </button>
                ) : null}
              </div>
              <p className="mt-4 text-xs text-[#77756d]">
                Una propuesta ya generada conserva los parámetros con los que se
                creó. Si cambiás la configuración, el entrenador debe
                regenerarla para usar los nuevos valores.
              </p>
            </form>
          )}
        </BentoCard>
      </main>
    </div>
  );
}
