import { Link } from 'react-router-dom';

import { formatDate } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { useTrainerProposals } from '../hooks/useTrainerProposals';

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
          className="btn-secondary btn-sm"
        >
          Reintentar
        </button>
      </p>
    );
  if (!pending.length) return null;
  return (
    <BentoCard>
      <h2 className="font-display text-lg font-semibold tracking-tight">
        Propuestas de adaptación pendientes
      </h2>
      <p className="mt-2 text-sm text-[#68675f]">
        Abrí la propuesta para ver la planilla y los datos que la sustentan
        antes de aprobar.
      </p>
      <ul className="mt-3 space-y-2">
        {pending.map((proposal) => (
          <li key={proposal.id}>
            <Link
              to={`/entrenador/rutinas/revisar/${proposal.id}`}
              className="block rounded-2xl border border-[#292823]/8 bg-white/70 p-4 text-sm font-semibold transition hover:border-[#292823]/15 hover:bg-white"
            >
              Ver propuesta del {formatDate(proposal.createdAt)} ·{' '}
              {proposal.adjustmentsCount} ajuste
              {proposal.adjustmentsCount === 1 ? '' : 's'}
              {proposal.advertenciaDatos.sinDatosActualizados
                ? ' · generada sin datos actualizados'
                : ' · con datos actualizados'}
            </Link>
          </li>
        ))}
      </ul>
    </BentoCard>
  );
}
