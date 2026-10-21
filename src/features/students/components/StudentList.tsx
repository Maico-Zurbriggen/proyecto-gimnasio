import { useTrainerStudents } from '../hooks/useTrainerStudents';
import { matchesStudentName } from '../lib/matchesStudentName';
import { StudentRow } from './StudentRow';

/** Cartera del entrenador desde `GET /trainers/me/students`, con carga, vacío y error. */
export function StudentList({ query = '' }: { query?: string }) {
  const { data, error, isPending, isFetching, refetch } = useTrainerStudents();

  if (isPending) {
    return (
      <p role="status" className="text-sm text-[#68675f]">
        Cargando alumnos…
      </p>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="field-error">No pudimos cargar tu cartera.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="btn-secondary btn-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="surface-muted py-10 text-center text-sm text-[#68675f]">
        Todavía no tenés alumnos asignados.
      </p>
    );
  }

  const visibles = data.filter((student) =>
    matchesStudentName(student.displayName, query),
  );
  if (visibles.length === 0) {
    return (
      <p
        role="status"
        className="surface-muted py-10 text-center text-sm text-[#68675f]"
      >
        Ningún alumno coincide con «{query.trim()}».
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {visibles.map((student) => (
        <StudentRow key={student.studentId} student={student} />
      ))}
    </div>
  );
}
