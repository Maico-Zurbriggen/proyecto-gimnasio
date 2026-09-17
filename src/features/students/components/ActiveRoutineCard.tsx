import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import type { ActiveRoutine } from '../../../api/routines';
import { humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { useStudentActiveRoutine } from '../hooks/useStudentActiveRoutine';

export interface ActiveRoutineCardProps {
  /** UUID del alumno en el backend; sin él no hay nada que consultar. */
  studentUserId?: string;
  /** Ruta de la rutina completa dentro de la ficha. */
  routineHref: string;
  className?: string;
}

function formatRenewal({ avisoRenovacion }: ActiveRoutine): string {
  const { diasRestantes, fechaVencimiento } = avisoRenovacion;
  const fecha = new Date(fechaVencimiento).toLocaleDateString('es-AR', {
    timeZone: 'UTC',
  });

  if (avisoRenovacion.estado === 'vencido') {
    const dias = Math.abs(diasRestantes);
    return `Ciclo vencido hace ${dias} ${dias === 1 ? 'día' : 'días'} (${fecha}).`;
  }
  if (avisoRenovacion.estado === 'cerrado hoy') {
    return `El ciclo se cumple hoy (${fecha}).`;
  }
  return `Renueva en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'} (${fecha}).`;
}

/**
 * Rutina vigente del alumno en la ficha del entrenador, desde
 * `GET /students/:studentId/routines/active`. Declara cuando no hay rutina o
 * no se pudo consultar, en lugar de mostrar datos de referencia (RF-051).
 */
export function ActiveRoutineCard({
  studentUserId,
  routineHref,
  className,
}: ActiveRoutineCardProps) {
  const { data, error, isPending, isFetching, refetch } =
    useStudentActiveRoutine(studentUserId);

  let content;
  if (!studentUserId) {
    content = (
      <p className="mt-3 text-xs text-[#8c897f]">
        Este alumno no tiene usuario en el backend.
      </p>
    );
  } else if (isPending) {
    content = (
      <p role="status" className="mt-3 text-xs text-[#8c897f]">
        Consultando la rutina vigente…
      </p>
    );
  } else if (error) {
    const sinRutina =
      error instanceof ApiError &&
      (error.status === 404 || error.status === 409);
    // RF-066: el backend sólo deja ver alumnos con asignación vigente.
    const sinAsignacion = error instanceof ApiError && error.status === 403;

    if (sinRutina) {
      content = (
        <div>
          <h3 className="font-display mt-3 text-xl font-semibold tracking-[-0.05em]">
            Sin rutina vigente
          </h3>
          <p className="mt-1 text-xs text-[#77756d]">
            Este alumno no tiene una prescripción asignada.
          </p>
        </div>
      );
    } else if (sinAsignacion) {
      content = (
        <p className="mt-3 text-xs text-[#7a2a20]">
          Este alumno no está asignado a tu cartera.
        </p>
      );
    } else {
      content = (
        <div className="mt-3 flex flex-col items-start gap-3">
          <p className="text-xs text-[#7a2a20]">
            No pudimos consultar la rutina vigente.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            Reintentar
          </button>
        </div>
      );
    }
  } else {
    content = (
      <>
        <h3 className="font-display mt-3 text-xl font-semibold tracking-[-0.05em]">
          {humanizeEnum(data.routineType)}
        </h3>
        <p className="mt-1 text-xs text-[#77756d]">
          {data.targetWeeklyFrequency} días por semana · ciclo de{' '}
          {data.duracionCicloDias} días
          {data.currentVersionNumber
            ? ` · versión ${data.currentVersionNumber}`
            : ''}
        </p>
        <p className="mt-3 text-xs font-semibold">{formatRenewal(data)}</p>
        <Link
          to={routineHref}
          className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#586d26]"
        >
          Ver rutina completa <ArrowUpRight className="size-3.5" />
        </Link>
      </>
    );
  }

  return (
    <BentoCard className={className}>
      <p className="eyebrow text-[#77756d]">Rutina vigente</p>
      {content}
    </BentoCard>
  );
}
