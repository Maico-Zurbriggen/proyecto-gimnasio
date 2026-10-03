import type { ReactNode } from 'react';

import type { RoutineSummary } from '../../../api/prescriptions';
import { Banner } from '../../../shared/components/Banner';
import { RoutinePrompt } from '../../../shared/components/RoutinePrompt';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { useSession } from '../../auth/hooks/useSession';
import { RoutineContentView } from '../components/RoutineContentView';
import {
  useRoutineContent,
  useStudentRoutines,
} from '../hooks/usePrescriptions';

const TIPOS: Record<string, string> = {
  FUERZA: 'Fuerza',
  HIPERTROFIA: 'Hipertrofia',
  RESISTENCIA_MUSCULAR: 'Resistencia muscular',
  ACONDICIONAMIENTO_GENERAL: 'Acondicionamiento general',
};

function StudentRoutineSection({
  studentId,
  routine,
}: {
  studentId: string;
  routine: RoutineSummary;
}) {
  const contenido = useRoutineContent(studentId, routine.id);
  const pendiente = routine.state !== 'VIGENTE';
  const headingId = `routine-${routine.id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div>
        <h2
          id={headingId}
          className="font-display text-xl font-semibold tracking-[-0.04em]"
        >
          {pendiente ? 'Rutina pendiente de revisión' : 'Rutina vigente'}
        </h2>
        <p className="mt-2 text-sm text-[#55534c]">
          {TIPOS[routine.routineType] ?? routine.routineType} ·{' '}
          {routine.targetWeeklyFrequency} días por semana · versión{' '}
          {routine.versionNumber}
        </p>
        <p className="mt-1 text-xs text-[#77756d]">
          {routine.origin === 'GENERADA'
            ? 'Generada'
            : 'Asignada por entrenador'}
          {' · '}
          Solicitada el{' '}
          {new Intl.DateTimeFormat('es-AR', {
            dateStyle: 'short',
            timeStyle: 'short',
          }).format(new Date(routine.requestedAt))}
        </p>
      </div>

      {pendiente ? (
        <Banner
          variant="warning"
          title={
            routine.state === 'BLOQUEADA'
              ? 'Esperando asignación de entrenador'
              : 'Pendiente de revisión'
          }
        >
          <p>
            {routine.state === 'BLOQUEADA'
              ? 'La rutina espera que el gimnasio te asigne un entrenador para revisarla y aprobarla.'
              : 'Tu entrenador debe revisar y aprobar esta rutina antes de que puedas entrenar con ella.'}
          </p>
        </Banner>
      ) : null}

      {contenido.isPending ? (
        <p role="status" className="text-sm text-[#77756d]">
          Cargando los días, ejercicios y series…
        </p>
      ) : null}

      {contenido.isError ? (
        <Banner
          variant="danger"
          title="No pudimos cargar el contenido de esta rutina"
          actions={
            <button
              type="button"
              onClick={() => void contenido.refetch()}
              disabled={contenido.isFetching}
              className="w-fit rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              Reintentar
            </button>
          }
        />
      ) : null}

      {contenido.data ? (
        <>
          <RoutinePrompt prompt={contenido.data.generationPrompt} />
          <RoutineContentView routine={contenido.data} />
        </>
      ) : null}
    </section>
  );
}

/** Rutinas propias: la vigente y la pendiente, con su estado explícito (RF-026, RF-110). */
export function StudentRoutinePage({
  generationPanel,
}: {
  generationPanel?: ReactNode;
}) {
  const { user } = useSession();
  const studentId = user?.id ?? '';
  const routines = useStudentRoutines(studentId);

  const vigente = (routines.data ?? []).find(
    (routine) => routine.state === 'VIGENTE',
  );
  const propuesta = (routines.data ?? []).find(
    (routine) => routine.state === 'PROPUESTA' || routine.state === 'BLOQUEADA',
  );

  return (
    <div>
      <PageHeader
        kicker="Mi rutina"
        title="Mi rutina"
        description="Consultá los días, ejercicios y series de tus rutinas."
      />
      <main className="flex flex-col gap-8 px-4 pb-10 sm:px-7 lg:px-9">
        {generationPanel}
        {routines.isLoading ? (
          <p role="status" className="text-sm text-[#77756d]">
            Cargando tu rutina…
          </p>
        ) : null}

        {routines.isError ? (
          <BentoCard>
            <p className="text-coral-strong text-sm font-medium">
              No pudimos cargar tu rutina. Probá de nuevo en un momento.
            </p>
          </BentoCard>
        ) : null}

        {!routines.isLoading && !routines.isError && !vigente && !propuesta ? (
          <BentoCard>
            <p className="eyebrow text-[#77756d]">Todavía no hay nada acá</p>
            <h2 className="font-display mt-2 text-xl font-semibold tracking-[-0.04em]">
              No tenés una rutina vigente
            </h2>
            <p className="mt-2 text-sm text-[#55534c]">
              Cuando tu entrenador te asigne una y la apruebe, la vas a ver en
              esta pantalla con sus días, ejercicios y series.
            </p>
          </BentoCard>
        ) : null}

        {propuesta ? (
          <StudentRoutineSection studentId={studentId} routine={propuesta} />
        ) : null}

        {vigente ? (
          <StudentRoutineSection studentId={studentId} routine={vigente} />
        ) : null}
      </main>
    </div>
  );
}
