import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { fetchTrainerStudents } from '../../../api/students';
import { humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SectionTabs } from '../../../shared/ui/SectionTabs';
import { useTrainerProposals } from '../hooks/useTrainerProposals';

function LoadError({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  return (
    <div className="mt-5 flex flex-col items-start gap-3">
      <p className="text-xs text-[#7a2a20]">
        No pudimos cargar la información.
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        Reintentar
      </button>
    </div>
  );
}

/** Propuestas pendientes desde `GET /trainers/me/proposals` (HU04). */
function PendingProposals() {
  const { data, error, isPending, isFetching, refetch } = useTrainerProposals();

  return (
    <BentoCard>
      <p className="eyebrow text-[#77756d]">
        Propuestas pendientes de revisión
      </p>
      {isPending ? (
        <p role="status" className="mt-5 text-xs text-[#8c897f]">
          Cargando propuestas…
        </p>
      ) : error ? (
        <LoadError onRetry={() => void refetch()} busy={isFetching} />
      ) : data.length === 0 ? (
        <p className="mt-5 text-xs text-[#8c897f]">
          No hay propuestas esperando tu revisión.
        </p>
      ) : (
        <div className="mt-5 space-y-2">
          {data.map((proposal) => (
            <Link
              key={proposal.id}
              to={`/entrenador/rutinas/revisar/${proposal.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#292823]/8 p-4 transition hover:bg-[#faf9f4]"
            >
              <div>
                <p className="text-xs font-bold">
                  {proposal.student.displayName}
                </p>
                <p className="mt-1 text-[10px] text-[#77756d]">
                  {humanizeEnum(proposal.globalSituation)} ·{' '}
                  {proposal.adjustmentsCount}{' '}
                  {proposal.adjustmentsCount === 1 ? 'ajuste' : 'ajustes'} ·{' '}
                  {proposal.advertenciaDatos.sinDatosActualizados
                    ? 'Generada sin datos actualizados'
                    : 'Generada con datos actualizados'}
                </p>
              </div>
              <ArrowUpRight className="size-4 shrink-0 text-[#77756d]" />
            </Link>
          ))}
        </div>
      )}
    </BentoCard>
  );
}

/** Rutinas vigentes de la cartera, desde `GET /trainers/me/students`. */
function AssignedRoutines() {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['trainers', 'me', 'students'],
    queryFn: ({ signal }) => fetchTrainerStudents(signal),
  });
  const withRoutine = (data ?? []).filter((student) => student.rutinaVigente);

  return (
    <BentoCard>
      <p className="eyebrow text-[#77756d]">Rutinas asignadas</p>
      {isPending ? (
        <p role="status" className="mt-5 text-xs text-[#8c897f]">
          Cargando rutinas…
        </p>
      ) : error ? (
        <LoadError onRetry={() => void refetch()} busy={isFetching} />
      ) : withRoutine.length === 0 ? (
        <p className="mt-5 text-xs text-[#8c897f]">
          Ningún alumno de tu cartera tiene una rutina vigente.
        </p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-[#292823]/8">
          {withRoutine.map((student) => {
            const routine = student.rutinaVigente!;
            const vencida = routine.estadoAviso === 'vencido';
            return (
              <Link
                key={student.studentId}
                to={`/entrenador/alumnos/${student.studentId}`}
                className="flex items-center justify-between gap-3 border-b border-[#292823]/7 px-4 py-4 last:border-b-0 hover:bg-[#faf9f4]"
              >
                <div>
                  <p className="text-xs font-bold">{student.displayName}</p>
                  <p className="text-[10px] text-[#77756d]">
                    {humanizeEnum(routine.routineType)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${vencida ? 'bg-[#fbe7e5] text-coral-text' : 'bg-lime-soft text-[#4a5b27]'}`}
                >
                  {vencida
                    ? 'Ciclo vencido'
                    : routine.estadoAviso === 'cerrado hoy'
                      ? 'Renueva hoy'
                      : `Renueva en ${routine.diasRestantesRenovacion} días`}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </BentoCard>
  );
}

/** Listado de rutinas por alumno y propuestas por revisar. */
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
        {showPending ? <PendingProposals /> : <AssignedRoutines />}
      </main>
    </div>
  );
}
