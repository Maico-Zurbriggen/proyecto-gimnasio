import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Dumbbell,
  History,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import {
  fetchStudentRoutines,
  fetchRoutineContent,
  studentRoutinesQueryKey,
  routineContentQueryKey,
  type RoutineSummary,
} from '../../../api/prescriptions';
import { Banner } from '../../../shared/components/Banner';
import { RoutinePrompt } from '../../../shared/components/RoutinePrompt';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { RoutineGenerationPanel } from '../../routine-generations/components/RoutineGenerationPanel';
import { RenewalBanner } from '../components/RenewalBanner';
import { RenewalMeasurementForm } from '../components/RenewalMeasurementForm';
import { useActiveRoutine } from '../hooks/useActiveRoutine';
import { LoadingState } from '../../../shared/ui/LoadingState';

/**
 * Aviso de renovación alimentado por `GET /routines/active` (HU01). Declara
 * explícitamente cuando no hay rutina vigente o no se pudo consultar, en lugar
 * de ocultar el aviso como si el ciclo estuviera lejos de vencer (RF-051).
 */
function RenewalNoticeSection() {
  const { data, error, isPending, refetch, isFetching } = useActiveRoutine();
  const [cargando, setCargando] = useState(false);
  const [registrada, setRegistrada] = useState(false);

  if (isPending) {
    return (
      <LoadingState label="Consultando tu rutina vigente…" variant="card" />
    );
  }

  if (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 409)
    ) {
      return (
        <Banner variant="info" title="Todavía no tenés una rutina vigente">
          <p>
            Cuando tu entrenador apruebe tu rutina vas a ver acá cuántos días
            faltan para renovar el ciclo.
          </p>
        </Banner>
      );
    }

    const sinSesion =
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403);

    return (
      <Banner
        variant="danger"
        title="No pudimos consultar tu rutina"
        actions={
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="btn-primary btn-sm"
          >
            Reintentar
          </button>
        }
      >
        <p>
          {sinSesion
            ? 'No hay un alumno identificado para esta consulta.'
            : 'No sabemos cuántos días faltan para renovar tu ciclo.'}
        </p>
      </Banner>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <RenewalBanner
        studentId={data.studentId}
        aviso={data.avisoRenovacion}
        onCargarMedicion={() => {
          setRegistrada(false);
          setCargando(true);
        }}
      />

      {cargando ? (
        <BentoCard>
          <p className="eyebrow mb-4 text-[#77756d]">Cargar medidas</p>
          <RenewalMeasurementForm
            studentId={data.studentId}
            onRegistrada={() => {
              setCargando(false);
              setRegistrada(true);
            }}
            onCancelar={() => {
              setCargando(false);
            }}
          />
        </BentoCard>
      ) : null}

      {registrada ? (
        <Banner variant="info" title="Medidas registradas">
          <p>
            Tu entrenador va a ver tus datos actualizados en la próxima
            propuesta de ajuste.
          </p>
        </Banner>
      ) : null}
    </div>
  );
}

/** Resumen alimentado por las rutinas y el aviso de renovación del backend. */
export interface StudentOverviewPageProps {
  studentId: string;
}

interface RoutineListState {
  data: RoutineSummary[] | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
}

function StudentGenerationSection({
  studentId,
  routines,
}: StudentOverviewPageProps & { routines: RoutineListState }) {
  if (routines.isPending || routines.isFetching) {
    return (
      <LoadingState
        label="Verificando si tenés una propuesta pendiente…"
        variant="card"
      />
    );
  }

  if (routines.isError) {
    return (
      <Banner
        variant="danger"
        title="No pudimos verificar si podés solicitar otra rutina"
      >
        <p>
          Reintentá la consulta antes de crear una solicitud para evitar dos
          propuestas pendientes.
        </p>
      </Banner>
    );
  }

  const proposal = routines.data?.find(
    (routine) => routine.state === 'PROPUESTA' || routine.state === 'BLOQUEADA',
  );
  if (proposal) {
    return (
      <Banner
        variant="warning"
        title="Ya tenés una rutina pendiente de revisión"
        actions={
          <Link to="/alumno/rutina" className="btn-primary btn-sm">
            Ver rutina pendiente
          </Link>
        }
      >
        <p>Tu entrenador debe resolverla antes de que puedas solicitar otra.</p>
      </Banner>
    );
  }

  return <RoutineGenerationPanel studentId={studentId} />;
}

function RoutinePreviewSection({
  studentId,
  routines,
}: StudentOverviewPageProps & { routines: RoutineListState }) {
  const routine =
    routines.data?.find(
      (item) => item.state === 'PROPUESTA' || item.state === 'BLOQUEADA',
    ) ?? routines.data?.find((item) => item.state === 'VIGENTE');
  const content = useQuery({
    queryKey: routineContentQueryKey(studentId, routine?.id ?? ''),
    queryFn: ({ signal }) =>
      fetchRoutineContent(studentId, routine?.id ?? '', signal),
    enabled: Boolean(studentId && routine),
  });

  return (
    <BentoCard>
      {routines.isPending ? (
        <LoadingState label="Cargando tus rutinas…" variant="list" />
      ) : null}
      {routines.isError ? (
        <Banner variant="danger" title="No pudimos cargar tus rutinas" />
      ) : null}
      {!routines.isPending && !routines.isError && !routine ? (
        <p className="surface-muted py-10 text-center text-sm text-[#68675f]">
          Todavía no tenés una rutina para consultar.
        </p>
      ) : null}
      {routine ? (
        <div className="flex flex-col gap-4">
          <div className="border-b border-[#292823]/10 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow text-[#77756d]">Tu rutina</p>
                <h2 className="font-display mt-1 text-xl font-bold tracking-[-0.04em] text-ink">
                  {routine.state === 'VIGENTE'
                    ? 'Rutina vigente'
                    : 'Rutina pendiente de revisión'}
                </h2>
              </div>
              <span
                className={
                  routine.state === 'VIGENTE' ? 'chip-ok' : 'chip-warn'
                }
              >
                {routine.state === 'VIGENTE' ? 'Activa' : 'Pendiente'}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-[#44423b]">
              {routine.targetWeeklyFrequency} días por semana
            </p>
            {routine.state !== 'VIGENTE' ? (
              <p className="mt-1 text-xs text-[#77756d]">
                Tu entrenador debe aprobarla antes de que puedas entrenar con
                ella.
              </p>
            ) : null}
          </div>
          {content.isPending ? (
            <LoadingState
              label="Cargando los días y ejercicios…"
              variant="list"
            />
          ) : null}
          {content.isError ? (
            <p role="alert" className="field-error">
              No pudimos cargar el detalle de esta rutina. Podés reintentar
              desde Mi rutina.
            </p>
          ) : null}
          {content.data ? (
            <RoutinePrompt prompt={content.data.generationPrompt} />
          ) : null}
          {content.data ? (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {content.data.days.map((day) => (
                <li
                  key={day.position}
                  className="card-interactive flex gap-3.5 rounded-2xl border border-[#292823]/10 bg-[#fbfaf6] p-4.5 shadow-xs hover:border-[#292823]/30 hover:bg-white hover:shadow-md"
                >
                  <span
                    aria-hidden="true"
                    className="font-display flex size-9 shrink-0 items-center justify-center rounded-xl bg-graphite text-xs font-bold text-lime shadow-xs"
                  >
                    {day.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-base font-bold tracking-tight text-ink">
                      Día {day.position} · {day.name}
                    </h3>
                    <p className="chip-neutral mt-2">
                      {day.exercises.length} ejercicios
                    </p>
                    <ul className="mt-3 space-y-1.5 text-xs text-[#55534c]">
                      {day.exercises.map((exercise) => (
                        <li
                          key={exercise.position}
                          className="flex items-center gap-2 truncate font-medium"
                        >
                          <span
                            className="size-1 rounded-full bg-graphite/40 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {exercise.exerciseName}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <Link to="/alumno/rutina" className="btn-primary btn-sm w-fit mt-2">
            Ver rutina completa{' '}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </BentoCard>
  );
}

export function StudentOverviewPage({ studentId }: StudentOverviewPageProps) {
  const routines = useQuery({
    queryKey: studentRoutinesQueryKey(studentId),
    queryFn: ({ signal }) => fetchStudentRoutines(studentId, signal),
    enabled: Boolean(studentId),
  });

  return (
    <div>
      <PageHeader
        kicker="Resumen semanal"
        title="Tu entrenamiento"
        description="Consultá tu rutina y seguí las solicitudes de generación."
      />
      <main className="page-body flex flex-col gap-6">
        {/* Accesos rápidos de entrenamiento */}
        <section
          aria-label="Accesos rápidos"
          className="grid grid-cols-2 gap-3.5 sm:grid-cols-4"
        >
          <Link
            to="/alumno/sesion"
            className="card-interactive flex items-center gap-3 rounded-2xl border border-[#292823]/10 bg-white/80 p-3.5 shadow-xs hover:border-graphite"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-graphite text-lime shadow-xs">
              <Dumbbell className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">Sesión de hoy</p>
              <p className="text-[11px] text-[#77756d]">Registrar series</p>
            </div>
          </Link>

          <Link
            to="/alumno/progreso"
            className="card-interactive flex items-center gap-3 rounded-2xl border border-[#292823]/10 bg-white/80 p-3.5 shadow-xs hover:border-graphite"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lime text-graphite shadow-xs">
              <TrendingUp className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">Mi progreso</p>
              <p className="text-[11px] text-[#77756d]">Adherencia y volumen</p>
            </div>
          </Link>

          <Link
            to="/alumno/historial"
            className="card-interactive flex items-center gap-3 rounded-2xl border border-[#292823]/10 bg-white/80 p-3.5 shadow-xs hover:border-graphite"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#292823]/6 text-ink shadow-xs">
              <History className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">Historial</p>
              <p className="text-[11px] text-[#77756d]">Sesiones pasadas</p>
            </div>
          </Link>

          <Link
            to="/alumno/perfil"
            className="card-interactive flex items-center gap-3 rounded-2xl border border-[#292823]/10 bg-white/80 p-3.5 shadow-xs hover:border-graphite"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#292823]/6 text-ink shadow-xs">
              <UserRound className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">Mi ficha</p>
              <p className="text-[11px] text-[#77756d]">Objetivos y medidas</p>
            </div>
          </Link>
        </section>

        <RenewalNoticeSection />

        <StudentGenerationSection studentId={studentId} routines={routines} />

        <RoutinePreviewSection studentId={studentId} routines={routines} />
      </main>
    </div>
  );
}
