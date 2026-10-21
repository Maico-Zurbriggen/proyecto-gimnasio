import { Link } from 'react-router-dom';

import { formatDate } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { useTrainerProposals } from '../hooks/useTrainerProposals';
import { adjustmentEvidenceSummary } from './AdjustmentEvidence';

export function StudentPendingProposals({ studentId }: { studentId: string }) {
  const proposals = useTrainerProposals();
  const pending =
    proposals.data?.filter((proposal) => proposal.student.id === studentId) ??
    [];
  if (proposals.isPending)
    return <p className="mt-4 text-xs">Cargando propuestas de adaptación…</p>;
  if (proposals.error)
    return (
      <p role="status" className="mt-4 text-xs">
        No se pudieron cargar las propuestas de adaptación.{' '}
        <button
          type="button"
          onClick={() => void proposals.refetch()}
          className="underline"
        >
          Reintentar
        </button>
      </p>
    );
  if (!pending.length) return null;
  return (
    <BentoCard className="mt-4">
      <h2 className="font-display text-xl font-semibold">
        Propuestas de adaptación pendientes
      </h2>
      <p className="mt-2 text-xs text-[#77756d]">
        Abrí la propuesta para ver la planilla y los datos que la sustentan
        antes de aprobar.
      </p>
      <ul className="mt-3 space-y-2">
        {pending.map((proposal) => (
          <li key={proposal.id}>
            <Link
              to={`/entrenador/rutinas/revisar/${proposal.id}`}
              className="block rounded-xl border border-[#292823]/10 p-3 text-sm font-semibold hover:bg-[#faf9f4]"
            >
              Ver propuesta del {formatDate(proposal.createdAt)} ·{' '}
              {proposal.adjustmentsCount} ajuste
              {proposal.adjustmentsCount === 1 ? '' : 's'}
              {proposal.advertenciaDatos.sinDatosActualizados
                ? ' · generada sin datos actualizados'
                : ' · con datos actualizados'}
              {(proposal.adjustments ?? []).slice(0, 2).map((adjustment) => (
                <span
                  key={adjustment.id}
                  className="mt-1 block text-[11px] font-normal text-[#3d3c36]"
                >
                  {adjustmentEvidenceSummary(adjustment)}
                </span>
              ))}
            </Link>
          </li>
        ))}
      </ul>
    </BentoCard>
  );
}
