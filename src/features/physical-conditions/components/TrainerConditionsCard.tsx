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
    <BentoCard className="mt-4">
      <h2 className="eyebrow text-[#5f5d55]">Condiciones físicas</h2>
      {status.isPending ? (
        <p role="status" className="mt-4 text-sm text-[#5f5d55]">
          Cargando…
        </p>
      ) : status.isError ? (
        <div role="alert" className="mt-4 flex flex-col items-start gap-3">
          <p className="text-sm">No pudimos cargar las condiciones.</p>
          <button
            type="button"
            onClick={() => void status.refetch()}
            className="bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      ) : !status.data.healthDataConsent ? (
        <p className="mt-4 text-sm text-[#5f5d55]">
          El alumno todavía no dio su consentimiento para datos de salud: no se
          pueden ver ni declarar condiciones.
        </p>
      ) : conditions.isPending ? (
        <p role="status" className="mt-4 text-sm text-[#5f5d55]">
          Cargando condiciones…
        </p>
      ) : conditions.isError ? (
        <div role="alert" className="mt-4 flex flex-col items-start gap-3">
          <p className="text-sm">No pudimos cargar las condiciones.</p>
          <button
            type="button"
            onClick={() => void conditions.refetch()}
            className="bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      ) : conditions.data.length === 0 ? (
        <p className="mt-4 text-sm text-[#5f5d55]">
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
