import { ArrowUpRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SectionTabs } from '../../../shared/ui/SectionTabs';
import { MOCK_PROPOSALS } from '../data/mockProposals';

const ASSIGNED_ROUTINES = [
  { student: 'Maia Pérez', routine: 'Fuerza base · 4 días', state: 'Vigente' },
  { student: 'Sofía Medina', routine: 'Funcional · 3 días', state: 'Vigente' },
];

/**
 * Listado de rutinas por alumno. La pestaña "Por revisar" enlaza con la
 * pantalla real de HU04; "Asignadas" es de referencia visual.
 */
export function TrainerRoutinesPage() {
  const { pathname } = useLocation();
  const showPending = pathname.startsWith('/entrenador/rutinas/revisar');

  return (
    <div>
      <PageHeader
        kicker="Rutinas"
        title="Prescripción por alumno."
        description="Las ediciones sobre una rutina asignada no modifican la plantilla de origen ni el historial de sesiones."
      />
      <main className="px-4 pb-10 sm:px-7 lg:px-9">
        <SectionTabs
          tabs={[
            { label: 'Asignadas', to: '/entrenador/rutinas', end: true },
            { label: 'Por revisar', to: '/entrenador/rutinas/revisar' },
          ]}
        />

        {showPending ? (
          <BentoCard>
            <p className="eyebrow text-[#77756d]">
              Propuestas pendientes de revisión
            </p>
            <div className="mt-5 space-y-2">
              {MOCK_PROPOSALS.map((proposal) => (
                <Link
                  key={proposal.id}
                  to={`/entrenador/rutinas/revisar/${proposal.id}`}
                  className="flex items-center justify-between rounded-2xl border border-[#292823]/8 p-4 transition hover:bg-[#faf9f4]"
                >
                  <div>
                    <p className="text-xs font-bold">{proposal.studentName}</p>
                    <p className="mt-1 text-[10px] text-[#77756d]">
                      {proposal.sinDatosActualizados
                        ? 'Generada sin datos actualizados'
                        : 'Generada con datos actualizados'}
                    </p>
                  </div>
                  <ArrowUpRight className="size-4 text-[#77756d]" />
                </Link>
              ))}
            </div>
          </BentoCard>
        ) : (
          <BentoCard>
            <p className="eyebrow text-[#77756d]">Rutinas asignadas</p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#292823]/8">
              {ASSIGNED_ROUTINES.map((item) => (
                <div
                  key={item.student}
                  className="flex items-center justify-between border-b border-[#292823]/7 px-4 py-4 last:border-b-0"
                >
                  <div>
                    <p className="text-xs font-bold">{item.student}</p>
                    <p className="text-[10px] text-[#77756d]">{item.routine}</p>
                  </div>
                  <span className="rounded-full bg-lime-soft px-2.5 py-1 text-[10px] font-bold text-[#4a5b27]">
                    {item.state}
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>
        )}
      </main>
    </div>
  );
}
