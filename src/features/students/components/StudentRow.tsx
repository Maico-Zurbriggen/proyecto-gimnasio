import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { TrainerStudent } from '../../../api/students';
import { formatDate, humanizeEnum } from '../../../shared/lib/format';
import { pendingReviewsForStudent } from '../lib/pendingReviews';

type Signal = 'En ritmo' | 'Revisar' | 'Bloqueado';

const SIGNAL_CLASS: Record<Signal, string> = {
  'En ritmo': 'chip-ok',
  Revisar: 'chip-warn',
  Bloqueado: 'chip-danger',
};

function signalOf(student: TrainerStudent): Signal {
  if (student.bloqueado) {
    return 'Bloqueado';
  }
  if (
    pendingReviewsForStudent(student) > 0 ||
    !student.rutinaVigente ||
    student.rutinaVigente.estadoAviso === 'vencido'
  ) {
    return 'Revisar';
  }
  return 'En ritmo';
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function routineSummary({ rutinaVigente }: TrainerStudent): string {
  if (!rutinaVigente) {
    return 'Sin rutina vigente';
  }
  const tipo = humanizeEnum(rutinaVigente.routineType);
  if (rutinaVigente.estadoAviso === 'vencido') {
    return `${tipo} · ciclo vencido`;
  }
  if (rutinaVigente.estadoAviso === 'cerrado hoy') {
    return `${tipo} · renueva hoy`;
  }
  const dias = rutinaVigente.diasRestantesRenovacion;
  return `${tipo} · renueva en ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

/** Fila de alumno reutilizada en cartera y listado (estilo Vivaz Adaptive ). */
export function StudentRow({ student }: { student: TrainerStudent }) {
  const signal = signalOf(student);
  const pendingReviews = pendingReviewsForStudent(student);

  return (
    <Link
      to={`/entrenador/alumnos/${student.studentId}`}
      className="group card-interactive flex flex-wrap items-center gap-3.5 rounded-2xl border border-[#292823]/10 bg-white/85 p-4 shadow-xs backdrop-blur-xs hover:border-[#292823]/25 hover:bg-white hover:shadow-md sm:flex-nowrap"
    >
      <div className="avatar size-10 rounded-xl shadow-xs ring-1 ring-black/5">
        {initials(student.displayName)}
      </div>
      <div className="min-w-[9rem] flex-1">
        <p className="text-sm font-bold text-ink group-hover:text-black transition-colors">
          {student.displayName}
        </p>
        <p className="mt-0.5 text-xs text-[#77756d]">
          {routineSummary(student)}
        </p>
        <p className="mt-1 text-xs text-[#77756d]">
          Última sesión:{' '}
          {student.ultimaSesion
            ? formatDate(student.ultimaSesion)
            : 'sin datos'}
          {' · '}Adherencia:{' '}
          {student.adherenciaReciente === null
            ? 'sin datos suficientes'
            : `${Math.round(student.adherenciaReciente)} %`}
        </p>
        {student.senales.length > 0 ? (
          <p className="mt-1 text-xs font-semibold text-[#8a5a00]">
            {student.senales.map(humanizeEnum).join(' · ')}
          </p>
        ) : null}
      </div>
      {student.fechaUltimaMedicion === null ? (
        <span className="text-xs font-bold text-[#b23f2f]">Sin mediciones</span>
      ) : null}
      {pendingReviews > 0 ? (
        <span className="text-xs font-bold text-[#77756d]">
          {pendingReviews}{' '}
          {pendingReviews === 1
            ? 'revisión pendiente'
            : 'revisiones pendientes'}
        </span>
      ) : null}
      <span className={SIGNAL_CLASS[signal]}>{signal}</span>
      <ArrowUpRight
        className="size-4 text-[#77756d] transition group-hover:text-graphite"
        aria-hidden="true"
      />
    </Link>
  );
}
