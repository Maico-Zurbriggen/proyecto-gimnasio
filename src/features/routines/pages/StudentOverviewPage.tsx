import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import {
  fetchStudentRoutines,
  fetchRoutineContent,
  studentRoutinesQueryKey,
  routineContentQueryKey,
} from '../../../api/prescriptions';
import { Banner } from '../../../shared/components/Banner';
import { RoutinePrompt } from '../../../shared/components/RoutinePrompt';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { RoutineGenerationPanel } from '../../routine-generations/components/RoutineGenerationPanel';
import { RenewalBanner } from '../components/RenewalBanner';
import { RenewalMeasurementForm } from '../components/RenewalMeasurementForm';
import { useActiveRoutine } from '../hooks/useActiveRoutine';

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
      <p role="status" className="text-xs text-[#77756d]">
        Consultando tu rutina vigente…
      </p>
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
            className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
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
        <div className="rounded-2xl border border-[#292823]/10 bg-white p-5">
          <p className="eyebrow mb-3 text-[#77756d]">Cargar medidas</p>
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
        </div>
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

function RoutinePreviewSection({ studentId }: StudentOverviewPageProps) {
  const routines = useQuery({
    queryKey: studentRoutinesQueryKey(studentId),
    queryFn: ({ signal }) => fetchStudentRoutines(studentId, signal),
    enabled: Boolean(studentId),
  });
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
      {routines.isPending ? <p role="status">Cargando tus rutinas…</p> : null}
      {routines.isError ? (
        <Banner variant="danger" title="No pudimos cargar tus rutinas" />
      ) : null}
      {!routines.isPending && !routines.isError && !routine ? (
        <p className="text-sm text-[#77756d]">
          Todavía no tenés una rutina para consultar.
        </p>
      ) : null}
      {routine ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="eyebrow text-[#77756d]">Tu rutina</p>
            <h2 className="font-display mt-2 text-xl font-semibold tracking-[-0.04em]">
              {routine.state === 'VIGENTE'
                ? 'Rutina vigente'
                : 'Rutina pendiente de revisión'}
            </h2>
            <p className="mt-2 text-sm text-[#55534c]">
              {routine.targetWeeklyFrequency} días por semana
            </p>
            {routine.state !== 'VIGENTE' ? (
              <p className="mt-2 text-sm text-[#77756d]">
                Tu entrenador debe aprobarla antes de que puedas entrenar con
                ella.
              </p>
            ) : null}
          </div>
          {content.isPending ? (
            <p role="status">Cargando los días y ejercicios…</p>
          ) : null}
          {content.isError ? (
            <p role="alert">
              No pudimos cargar el detalle de esta rutina. Podés reintentar
              desde Mi rutina.
            </p>
          ) : null}
          {content.data ? (
            <RoutinePrompt prompt={content.data.generationPrompt} />
          ) : null}
          {content.data ? (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {content.data.days.map((day) => (
                <li
                  key={day.position}
                  className="rounded-xl border border-black/10 p-4"
                >
                  <h3 className="text-sm font-semibold">
                    Día {day.position} · {day.name}
                  </h3>
                  <p className="mt-2 text-xs text-[#77756d]">
                    {day.exercises.length} ejercicios
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-[#55534c]">
                    {day.exercises.slice(0, 3).map((exercise) => (
                      <li key={exercise.position}>{exercise.exerciseName}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : null}
          <Link
            to="/alumno/rutina"
            className="flex w-fit items-center gap-2 rounded-full bg-graphite px-4 py-2 text-xs font-bold text-white"
          >
            Ver rutina completa <ArrowUpRight className="size-4" />
          </Link>
        </div>
      ) : null}
    </BentoCard>
  );
}

export function StudentOverviewPage({ studentId }: StudentOverviewPageProps) {
  return (
    <div>
      <PageHeader
        kicker="Resumen semanal"
        title="Tu entrenamiento"
        description="Consultá tu rutina y seguí las solicitudes de generación."
      />
      <main className="flex flex-col gap-4 px-4 pb-10 sm:px-7 lg:px-9">
        <RenewalNoticeSection />

        <RoutineGenerationPanel studentId={studentId} />

        <RoutinePreviewSection studentId={studentId} />
      </main>
    </div>
  );
}
