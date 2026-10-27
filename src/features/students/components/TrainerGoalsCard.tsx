import { useQuery } from '@tanstack/react-query';

import { fetchGoals, goalsQueryKey } from '../../../api/studentContext';
import { formatDate, humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';

/** Objetivo vigente e historial del alumno, visibles para su entrenador. */
export function TrainerGoalsCard({ studentId }: { studentId: string }) {
  const goals = useQuery({
    queryKey: goalsQueryKey(studentId),
    queryFn: ({ signal }) => fetchGoals(studentId, signal),
  });

  return (
    <BentoCard>
      <h2 className="font-display text-lg font-semibold tracking-tight">
        Objetivo de entrenamiento
      </h2>
      {goals.isPending ? (
        <p role="status" className="mt-4 text-sm text-[#68675f]">
          Cargando objetivo…
        </p>
      ) : goals.isError ? (
        <div role="alert" className="mt-4 flex flex-col items-start gap-3">
          <p className="text-sm">No pudimos cargar el objetivo.</p>
          <button
            type="button"
            className="btn-secondary btn-sm"
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
