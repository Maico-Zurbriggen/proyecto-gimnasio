import { useQuery } from '@tanstack/react-query';

import {
  conditionsQueryKey,
  conditionsStatusQueryKey,
  fetchConditions,
  fetchConditionsStatus,
} from '../../../api/conditions';
import { formatDate } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { ConditionsList } from './ConditionsList';

/**
 * Condiciones del alumno en la ficha del entrenador, en solo lectura
 * (HU11 - criterio front 12): sin formulario ni botón de cerrar.
 */
export function TrainerConditionsCard({ studentId }: { studentId: string }) {
  const status = useQuery({
    queryKey: conditionsStatusQueryKey(studentId),
    queryFn: ({ signal }) => fetchConditionsStatus(studentId, signal),
  });
  const conditions = useQuery({
    queryKey: conditionsQueryKey(studentId),
    queryFn: ({ signal }) => fetchConditions(studentId, signal),
    enabled: status.data?.healthDataConsent === true,
  });

  return (
    <BentoCard>
      <h2 className="font-display text-lg font-semibold tracking-tight">
        Condiciones físicas
      </h2>
      {status.isPending ? (
        <p role="status" className="mt-4 text-sm text-[#68675f]">
          Cargando…
        </p>
      ) : status.isError ? (
        <div role="alert" className="mt-4 flex flex-col items-start gap-3">
          <p className="text-sm">No pudimos cargar las condiciones.</p>
          <button
            type="button"
            onClick={() => void status.refetch()}
            className="btn-secondary btn-sm"
          >
            Reintentar
          </button>
        </div>
      ) : !status.data.healthDataConsent ? (
        <p className="mt-4 text-sm text-[#68675f]">
          El alumno todavía no dio su consentimiento para datos de salud: no se
          pueden ver ni declarar condiciones.
        </p>
      ) : conditions.isPending ? (
        <p role="status" className="mt-4 text-sm text-[#68675f]">
          Cargando condiciones…
        </p>
      ) : conditions.isError ? (
        <div role="alert" className="mt-4 flex flex-col items-start gap-3">
          <p className="text-sm">No pudimos cargar las condiciones.</p>
          <button
            type="button"
            onClick={() => void conditions.refetch()}
            className="btn-secondary btn-sm"
          >
            Reintentar
          </button>
        </div>
      ) : conditions.data.length === 0 ? (
        <p className="mt-4 text-sm text-[#68675f]">
          {status.data.declaredNone
            ? `Declaró no tener ninguna condición física${status.data.declaredNoneAt ? ` (${formatDate(status.data.declaredNoneAt)})` : ''}.`
            : 'Todavía no respondió si tiene condiciones físicas.'}
        </p>
      ) : (
        <div className="mt-4">
          <ConditionsList conditions={conditions.data} />
        </div>
      )}
    </BentoCard>
  );
}
