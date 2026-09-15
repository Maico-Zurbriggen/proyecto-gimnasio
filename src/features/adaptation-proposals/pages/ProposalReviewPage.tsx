import { Link, useParams } from 'react-router-dom';

import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { OutdatedDataWarning } from '../components/OutdatedDataWarning';
import { findMockProposal } from '../data/mockProposals';

/**
 * Pantalla de revisión de una propuesta de adaptación (HU04). Esta tarea
 * cubre solo T2 (mostrar el flag de datos desactualizados antes de decidir);
 * las acciones de aprobar/aprobar parcialmente/rechazar y el payload real
 * de revisión son de otras tareas de la HU y quedan fuera de este alcance.
 */
export function ProposalReviewPage() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const proposal = findMockProposal(proposalId);

  if (!proposal) {
    return (
      <div>
        <PageHeader
          kicker="Revisión de propuesta"
          title="Propuesta no encontrada"
        />
        <main className="px-4 pb-10 sm:px-7 lg:px-9">
          <Link
            to="/entrenador/rutinas"
            className="text-xs font-bold text-[#586d26]"
          >
            Volver a rutinas
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        kicker="Revisión de propuesta"
        title={proposal.studentName}
        description="Propuesta de ajuste de ESTRUCTURA generada al cumplirse el ciclo de renovación."
      />
      <main className="flex flex-col gap-4 px-4 pb-10 sm:px-7 lg:px-9">
        <OutdatedDataWarning proposal={proposal} />

        <BentoCard>
          <p className="eyebrow text-[#77756d]">Decisión del entrenador</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              title="Fuera de alcance de esta tarea"
              className="rounded-full bg-[#e4e2d8] px-4 py-2.5 text-xs font-bold text-[#9a988e]"
            >
              Aprobar
            </button>
            <button
              type="button"
              disabled
              title="Fuera de alcance de esta tarea"
              className="rounded-full bg-[#e4e2d8] px-4 py-2.5 text-xs font-bold text-[#9a988e]"
            >
              Aprobar parcialmente
            </button>
            <button
              type="button"
              disabled
              title="Fuera de alcance de esta tarea"
              className="rounded-full bg-[#e4e2d8] px-4 py-2.5 text-xs font-bold text-[#9a988e]"
            >
              Rechazar
            </button>
          </div>
        </BentoCard>
      </main>
    </div>
  );
}
