import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { TrainerStudent } from '../../../api/students';
import { humanizeEnum } from '../../../shared/lib/format';

type Signal = 'En ritmo' | 'Revisar' | 'Bloqueado';

const SIGNAL_CLASS: Record<Signal, string> = {
  'En ritmo': 'bg-lime-soft text-[#526026]',
  Revisar: 'bg-[#f7ecd1] text-[#916c22]',
  Bloqueado: 'bg-[#fbe7e5] text-coral-text',
};

function signalOf(student: TrainerStudent): Signal {
  if (student.bloqueado) {
    return 'Bloqueado';
  }
  if (
    student.propuestasPendientes > 0 ||
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

  return (
    <Link
      to={`/entrenador/alumnos/${student.studentId}`}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#292823]/8 p-3 transition hover:bg-[#faf9f4] sm:flex-nowrap"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-coral text-[10px] font-bold text-[#35251e]">
        {initials(student.displayName)}
      </div>
      <div className="min-w-[9rem] flex-1">
        <p className="text-xs font-bold">{student.displayName}</p>
        <p className="mt-0.5 text-[10px] text-[#77756d]">
          {routineSummary(student)}
        </p>
      </div>
      {student.propuestasPendientes > 0 ? (
        <span className="text-[10px] font-bold text-[#77756d]">
          {student.propuestasPendientes}{' '}
          {student.propuestasPendientes === 1 ? 'propuesta' : 'propuestas'}
        </span>
      ) : null}
      <span
        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${SIGNAL_CLASS[signal]}`}
      >
        {signal}
      </span>
      <ArrowUpRight className="size-4 text-[#77756d]" />
    </Link>
  );
}
