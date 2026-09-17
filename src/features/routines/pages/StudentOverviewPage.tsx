import { Activity, ArrowUpRight, Dumbbell, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import { Banner } from '../../../shared/components/Banner';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { StatCard } from '../../../shared/ui/StatCard';
import { RenewalBanner } from '../components/RenewalBanner';
import { useActiveRoutine } from '../hooks/useActiveRoutine';

const NEXT_EXERCISES = [
  ['01', 'Remo con barra', '4 × 8', '62,5 kg'],
  ['02', 'Jalón al pecho', '3 × 10', '52,5 kg'],
  ['03', 'Curl inclinado', '3 × 12', '12 kg'],
] as const;

/**
 * Aviso de renovación alimentado por `GET /routines/active` (HU01). Declara
 * explícitamente cuando no hay rutina vigente o no se pudo consultar, en lugar
 * de ocultar el aviso como si el ciclo estuviera lejos de vencer (RF-051).
 */
function RenewalNoticeSection() {
  const { data, error, isPending, refetch, isFetching } = useActiveRoutine();

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
    <RenewalBanner
      studentId={data.studentId}
      aviso={data.avisoRenovacion}
      onCargarMedicion={() =>
        window.alert('Carga de medidas: fuera de alcance (HU02).')
      }
    />
  );
}

/**
 * Resumen del alumno. Solo el aviso de renovación (HU01) está conectado al
 * backend; el resto de los módulos son de referencia visual.
 */
export function StudentOverviewPage() {
  return (
    <div>
      <PageHeader
        kicker="Resumen semanal"
        title="Buen día, Maia."
        description="Tu progreso no es una sensación: es la próxima decisión bien informada."
      />
      <main className="flex flex-col gap-4 px-4 pb-10 sm:px-7 lg:px-9">
        <RenewalNoticeSection />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <BentoCard
            tone="graphite"
            className="min-h-[220px] md:col-span-2 xl:col-span-7"
          >
            <div className="flex h-full flex-col justify-between gap-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow text-lime">Sesión de hoy</p>
                  <h2 className="font-display mt-3 text-2xl font-medium leading-tight tracking-[-0.05em]">
                    Espalda &amp; Bíceps
                  </h2>
                </div>
                <span className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-white/8">
                  <Dumbbell className="size-4 text-lime" />
                </span>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <span className="text-xs text-white/60">
                  6 ejercicios · 55–65 min
                </span>
                <Link
                  to="/alumno/rutina"
                  className="rounded-full bg-lime px-4 py-2 text-xs font-bold text-graphite transition hover:brightness-105"
                >
                  Ver rutina
                </Link>
              </div>
            </div>
          </BentoCard>

          <BentoCard tone="lime" className="md:col-span-2 xl:col-span-5">
            <div className="flex items-start justify-between">
              <p className="eyebrow opacity-65">Adherencia</p>
              <Activity className="size-4" />
            </div>
            <div className="mt-6 flex items-center gap-5">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-[7px] border-ink font-display text-xl font-bold tracking-[-0.06em]">
                88<span className="text-sm">%</span>
              </div>
              <div>
                <p className="font-display text-lg font-semibold tracking-[-0.04em]">
                  Vas 7 de 8
                </p>
                <p className="mt-1 text-xs leading-5 opacity-70">
                  Sesiones previstas en cuatro semanas.
                </p>
              </div>
            </div>
          </BentoCard>

          <StatCard
            label="Racha"
            value="12"
            detail="días en movimiento"
            icon={Flame}
            className="md:col-span-1 xl:col-span-4"
          />

          <BentoCard className="md:col-span-1 xl:col-span-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow text-[#77756d]">Tu próxima sesión</p>
                <h3 className="font-display mt-2 text-2xl font-semibold tracking-[-0.06em]">
                  Prescripción
                </h3>
              </div>
              <Link
                to="/alumno/rutina"
                aria-label="Ver rutina"
                className="flex size-8 items-center justify-center rounded-full border border-[#292823]/10"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <div className="mt-4 divide-y divide-[#292823]/8">
              {NEXT_EXERCISES.map(([order, name, scheme, load]) => (
                <div key={order} className="flex items-center gap-3 py-3">
                  <span className="font-display text-xs font-bold text-[#b4b2a9]">
                    {order}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{name}</p>
                    <p className="text-[10px] text-[#848178]">
                      {scheme} · descanso 90s
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f0efe8] px-2 py-1 text-[10px] font-bold">
                    {load}
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>
      </main>
    </div>
  );
}
