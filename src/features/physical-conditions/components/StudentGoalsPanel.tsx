import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';

import {
  GOAL_TYPES,
  declareGoal,
  fetchGoals,
  goalsQueryKey,
} from '../../../api/studentContext';
import { formatDate, humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';

type GoalType = (typeof GOAL_TYPES)[number];

export function StudentGoalsPanel({ studentId }: { studentId: string }) {
  const selectId = useId();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<GoalType | ''>('');
  const goals = useQuery({
    queryKey: goalsQueryKey(studentId),
    queryFn: ({ signal }) => fetchGoals(studentId, signal),
  });
  const save = useMutation({
    mutationFn: (type: GoalType) => declareGoal(studentId, type),
    onSuccess: async () => {
      setSelected('');
      await queryClient.invalidateQueries({
        queryKey: goalsQueryKey(studentId),
      });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selected) save.mutate(selected);
  };

  return (
    <BentoCard>
      <h2 className="font-display text-lg font-semibold tracking-tight">
        Objetivo de entrenamiento
      </h2>
      <p className="mt-1 text-sm text-[#68675f]">
        Tu objetivo vigente se utiliza para construir y revisar tus rutinas.
      </p>

      {goals.isPending ? (
        <p role="status" className="mt-4 text-sm text-[#77756d]">
          Cargando objetivo…
        </p>
      ) : goals.isError ? (
        <div className="mt-4 flex flex-col items-start gap-3">
          <p role="alert" className="field-error">
            No pudimos cargar tu objetivo.
          </p>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={goals.isFetching}
            onClick={() => void goals.refetch()}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="surface-muted mt-4">
            <p className="eyebrow text-[#77756d]">Objetivo vigente</p>
            <p className="font-display mt-1.5 text-base font-semibold tracking-tight">
              {goals.data.current
                ? humanizeEnum(goals.data.current.type)
                : 'Sin declarar'}
            </p>
            {goals.data.current ? (
              <p className="mt-1 text-xs text-[#68675f]">
                Desde {formatDate(goals.data.current.startsOn)}
              </p>
            ) : null}
          </div>

          <form
            aria-label="Actualizar objetivo de entrenamiento"
            className="mt-4 flex flex-col gap-3"
            onSubmit={submit}
          >
            <label htmlFor={selectId} className="field-label">
              {goals.data.current ? 'Cambiar objetivo' : 'Declarar objetivo'}
            </label>
            <select
              id={selectId}
              className="field"
              value={selected}
              onChange={(event) =>
                setSelected(event.target.value as GoalType | '')
              }
            >
              <option value="">Elegí un objetivo</option>
              {GOAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {humanizeEnum(type)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="btn-primary btn-sm self-start"
              disabled={!selected || save.isPending}
            >
              {save.isPending ? 'Guardando…' : 'Guardar objetivo'}
            </button>
            {save.isError ? (
              <p role="alert" className="field-error">
                No pudimos guardar el objetivo. Probá de nuevo.
              </p>
            ) : null}
          </form>

          {goals.data.history.length > 1 ? (
            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-semibold">
                Ver historial ({String(goals.data.history.length)})
              </summary>
              <ul className="mt-3 flex flex-col gap-2">
                {goals.data.history.map((goal) => (
                  <li key={goal.id} className="surface-muted text-sm">
                    <span className="font-semibold">
                      {humanizeEnum(goal.type)}
                    </span>{' '}
                    <span className="text-[#68675f]">
                      desde {formatDate(goal.startsOn)}
                      {goal.endsOn ? ` hasta ${formatDate(goal.endsOn)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </BentoCard>
  );
}
