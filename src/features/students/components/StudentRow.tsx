import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { MockStudent } from '../data/mockStudents';

const SIGNAL_CLASS: Record<MockStudent['signal'], string> = {
  'En ritmo': 'bg-lime-soft text-[#526026]',
  Revisar: 'bg-[#f7ecd1] text-[#916c22]',
  Bloqueado: 'bg-[#fbe7e5] text-coral-text',
};

/** Fila de alumno reutilizada en cartera y listado (estilo PULSO). */
export function StudentRow({ student }: { student: MockStudent }) {
  return (
    <Link
      to={`/entrenador/alumnos/${student.id}`}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#292823]/8 p-3 transition hover:bg-[#faf9f4] sm:flex-nowrap"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-coral text-[10px] font-bold text-[#35251e]">
        {student.initials}
      </div>
      <div className="min-w-[9rem] flex-1">
        <p className="text-xs font-bold">{student.name}</p>
        <p className="mt-0.5 text-[10px] text-[#77756d]">
          {student.goal} · última sesión {student.lastSession}
        </p>
      </div>
      <span className="font-display text-sm font-semibold">
        {student.adherence}
      </span>
      <span
        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${SIGNAL_CLASS[student.signal]}`}
      >
        {student.signal}
      </span>
      <ArrowUpRight className="size-4 text-[#77756d]" />
    </Link>
  );
}
