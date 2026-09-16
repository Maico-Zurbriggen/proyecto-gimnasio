import { useTrainerStudents } from '../hooks/useTrainerStudents';
import { StudentRow } from './StudentRow';

/** Cartera del entrenador desde `GET /trainers/me/students`, con carga, vacío y error. */
export function StudentList() {
  const { data, error, isPending, isFetching, refetch } = useTrainerStudents();

  if (isPending) {
    return (
      <p role="status" className="text-xs text-[#8c897f]">
        Cargando alumnos…
      </p>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-xs text-[#7a2a20]">No pudimos cargar tu cartera.</p>
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

  if (data.length === 0) {
    return (
      <p className="text-xs text-[#8c897f]">
        Todavía no tenés alumnos asignados.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((student) => (
        <StudentRow key={student.studentId} student={student} />
      ))}
    </div>
  );
}
