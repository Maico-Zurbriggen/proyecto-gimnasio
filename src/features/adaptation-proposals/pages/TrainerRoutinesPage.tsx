import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { fetchTrainerStudents } from '../../../api/students';
import { formatDate, humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SectionTabs } from '../../../shared/ui/SectionTabs';
import { usePendingRoutineReviews } from '../../prescriptions/hooks/usePrescriptions';
import { useTrainerStudents } from '../../students/hooks/useTrainerStudents';
import { originLabel } from '../../prescriptions/lib/origin';
import { useTrainerProposals } from '../hooks/useTrainerProposals';
import { adjustmentEvidenceSummary } from '../components/AdjustmentEvidence';

function LoadError({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  return (
    <div className="mt-5 flex flex-col items-start gap-3">
      <p className="field-error">No pudimos cargar la información.</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        className="btn-secondary btn-sm"
      >
        Reintentar
      </button>
    </div>
  );
}

/**
 * Bandeja de aceptación y rechazo de rutinas (HU17): cada rutina PROPUESTA de
 * la cartera, de la más antigua a la más reciente, con lo necesario para
 * priorizar sin abrirla.
 */
function PendingRoutineReviews() {
  const { data, error, isPending, isFetching, refetch } =
    usePendingRoutineReviews();
  // La cartera ya se carga para el contador del menú: de ahí sale el aviso de
  // alumnos sin mediciones, que conviene ver antes de aprobar.
  const cartera = useTrainerStudents();
  const sinMediciones = new Set(
    (cartera.data ?? [])
      .filter((student) => student.fechaUltimaMedicion === null)
      .map((student) => student.studentId),
  );

  return (
    <BentoCard>
      <p className="eyebrow text-[#5f5d55]">Rutinas nuevas por aprobar</p>
      {isPending ? (
        <p role="status" className="mt-5 text-xs text-[#5f5d55]">
          Cargando rutinas propuestas…
        </p>
      ) : error ? (
        <LoadError onRetry={() => void refetch()} busy={isFetching} />
      ) : data.length === 0 ? (
        <p className="surface-muted mt-5 flex items-center gap-2 text-sm text-[#68675f]">
          <CheckCircle2
            aria-hidden="true"
            className="size-4 shrink-0 text-[#586d26]"
          />
          No hay rutinas nuevas esperando tu revisión.
        </p>
      ) : (
        <ul
          aria-label="Rutinas por aprobar"
          className="mt-5 grid gap-3 xl:grid-cols-2"
        >
          {data.map((item) => (
            <li key={item.routineId}>
              <Link
                to={`/entrenador/rutinas/propuestas/${item.studentId}/${item.routineId}`}
                className="flex h-full items-center justify-between gap-3 rounded-2xl border border-[#292823]/8 bg-white/70 p-4 transition hover:border-[#292823]/15 hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold">{item.studentName}</p>
                  <p className="mt-1 text-xs text-[#68675f]">
                    {humanizeEnum(item.routineType)} · {String(item.dayCount)}{' '}
                    días · {String(item.exerciseCount)} ejercicios
                  </p>
                  <p className="mt-1 text-xs text-[#68675f]">
                    {originLabel(item)} · {formatDate(item.requestedAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.goalMismatch ? (
                      <span className="chip-warn">
                        <span aria-hidden="true">! </span>No coincide con el
                        objetivo
                      </span>
                    ) : null}
                    {sinMediciones.has(item.studentId) ? (
                      <span className="chip-danger">
                        Sin mediciones registradas
                      </span>
                    ) : null}
                    {item.replacesActiveRoutine ? (
                      <span className="chip-neutral">
                        <span aria-hidden="true">↻ </span>Reemplaza la vigente
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold">
                  Revisar
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BentoCard>
  );
}

/** Propuestas de adaptación pendientes desde `GET /trainers/me/proposals` (HU04). */
function PendingAdaptationProposals() {
  const { data, error, isPending, isFetching, refetch } = useTrainerProposals();

  return (
    <BentoCard>
      <p className="eyebrow text-[#77756d]">Propuestas de adaptación</p>
      {isPending ? (
        <p role="status" className="mt-5 text-xs text-[#8c897f]">
          Cargando propuestas…
        </p>
      ) : error ? (
        <LoadError onRetry={() => void refetch()} busy={isFetching} />
      ) : data.length === 0 ? (
        <p className="surface-muted mt-5 flex items-center gap-2 text-sm text-[#68675f]">
          <CheckCircle2
            aria-hidden="true"
            className="size-4 shrink-0 text-[#586d26]"
          />
          No hay propuestas de adaptación esperando tu revisión.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {data.map((proposal) => {
            const preview = (proposal.adjustments ?? []).slice(0, 2);
            const remaining = proposal.adjustmentsCount - preview.length;
            return (
              <Link
                key={proposal.id}
                to={`/entrenador/rutinas/revisar/${proposal.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#292823]/8 bg-white/70 p-4 transition hover:border-[#292823]/15 hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {proposal.student.displayName}
                  </p>
                  <p className="mt-1 text-xs text-[#68675f]">
                    {humanizeEnum(proposal.globalSituation)} ·{' '}
                    {proposal.adjustmentsCount}{' '}
                    {proposal.adjustmentsCount === 1 ? 'ajuste' : 'ajustes'} ·{' '}
                    {proposal.advertenciaDatos.sinDatosActualizados
                      ? 'Generada sin datos actualizados'
                      : 'Generada con datos actualizados'}
                  </p>
                  {preview.length > 0 ? (
                    <ul
                      aria-label="Criterio y dato de los ajustes"
                      className="mt-2 space-y-1"
                    >
                      {preview.map((adjustment) => (
                        <li
                          key={adjustment.id}
                          className="text-[11px] leading-snug text-[#3d3c36]"
                        >
                          {adjustmentEvidenceSummary(adjustment)}
                        </li>
                      ))}
                      {remaining > 0 ? (
                        <li className="text-[10px] text-[#77756d]">
                          +{remaining} ajuste{remaining === 1 ? '' : 's'} más en
                          el detalle
                        </li>
                      ) : null}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] text-[#77756d]">
                      Sin ajustes declarados.
                    </p>
                  )}
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-[#77756d]" />
              </Link>
            );
          })}
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
                  <p className="text-sm font-bold">{student.displayName}</p>
                  <p className="text-xs text-[#68675f]">
                    {humanizeEnum(routine.routineType)}
                  </p>
                </div>
                <span className={vencida ? 'chip-danger' : 'chip-ok'}>
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
      <main className="page-body">
        <SectionTabs
          tabs={[
            { label: 'Asignadas', to: '/entrenador/rutinas', end: true },
            { label: 'Por revisar', to: '/entrenador/rutinas/revisar' },
          ]}
        />
        {showPending ? (
          <div className="flex flex-col gap-4">
            <PendingRoutineReviews />
            <PendingAdaptationProposals />
          </div>
        ) : (
          <AssignedRoutines />
        )}
      </main>
    </div>
  );
}
