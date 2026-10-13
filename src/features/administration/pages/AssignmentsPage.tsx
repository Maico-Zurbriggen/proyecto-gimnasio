import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';

import {
  assignTrainer,
  assignmentsQueryKey,
  fetchAssignments,
  type AssignmentsOverview,
} from '../../../api/assignments';
import { apiMessage } from '../../../api/client';
import { formatDate } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';

type Student = AssignmentsOverview['students'][number];
type Trainer = AssignmentsOverview['trainers'][number];

function FilaAlumno({
  student,
  trainers,
}: {
  student: Student;
  trainers: Trainer[];
}) {
  const ids = useId();
  const queryClient = useQueryClient();
  const [elegido, setElegido] = useState(student.trainer?.id ?? '');
  const asignar = useMutation({
    mutationFn: () => assignTrainer(student.studentId, elegido),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: assignmentsQueryKey }),
  });
  // Un entrenador que además entrena no puede ser su propio entrenador.
  const opciones = trainers.filter((t) => t.id !== student.studentId);
  const sinCambios = elegido === (student.trainer?.id ?? '');

  return (
    <li className="flex flex-col gap-3 border-b border-[#292823]/7 px-4 py-4 last:border-b-0 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-bold">{student.displayName}</p>
        <p className="mt-0.5 text-xs break-all text-[#5f5d55]">
          {student.email}
        </p>
        <p className="mt-1 text-xs">
          {student.trainer ? (
            <span className="text-[#3b4d14]">
              <span aria-hidden="true">✓ </span>
              {student.trainer.displayName}
              {student.assignedAt
                ? ` · desde ${formatDate(student.assignedAt)}`
                : ''}
            </span>
          ) : (
            <span className="text-coral-text font-bold">
              <span aria-hidden="true">! </span>Sin entrenador asignado
            </span>
          )}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`${ids}-entrenador`} className="sr-only">
            Entrenador para {student.displayName}
          </label>
          <select
            id={`${ids}-entrenador`}
            value={elegido}
            onChange={(event) => setElegido(event.target.value)}
            className="rounded-xl border border-[#292823]/15 bg-white px-3 py-2 text-sm font-medium"
          >
            <option value="">Elegí un entrenador</option>
            {opciones.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.displayName} ({trainer.studentCount}{' '}
                {trainer.studentCount === 1 ? 'alumno' : 'alumnos'})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!elegido || sinCambios || asignar.isPending}
            aria-busy={asignar.isPending}
            onClick={() => asignar.mutate()}
            className="bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {asignar.isPending
              ? 'Guardando…'
              : student.trainer
                ? 'Cambiar'
                : 'Asignar'}
          </button>
        </div>
        <p aria-live="polite" className="text-xs">
          {asignar.isSuccess
            ? `Asignado a ${asignar.data.trainer.displayName}.${asignar.data.unblockedRoutines > 0 ? ' Sus rutinas pendientes pasaron a la bandeja del entrenador.' : ''}`
            : asignar.isError
              ? (apiMessage(asignar.error) ??
                'No se pudo asignar. Probá de nuevo.')
              : ''}
        </p>
      </div>
    </li>
  );
}

/**
 * Asignaciones entrenador–alumno (RF-066). El administrador ve primero a los
 * alumnos sin entrenador (FL-01/A2, RF-112): sin asignación nadie puede
 * revisar ni aprobar sus rutinas.
 */
export function AssignmentsPage() {
  const overview = useQuery({
    queryKey: assignmentsQueryKey,
    queryFn: ({ signal }) => fetchAssignments(signal),
  });

  const alumnos = [...(overview.data?.students ?? [])].sort(
    (a, b) => Number(a.trainer !== null) - Number(b.trainer !== null),
  );
  const sinEntrenador = alumnos.filter((s) => s.trainer === null).length;

  return (
    <div>
      <PageHeader
        kicker="Asignaciones"
        title="Entrenadores y alumnos."
        description="Cada alumno necesita un entrenador asignado para que sus rutinas se revisen y entren en vigencia."
      />
      <main className="px-4 pb-10 sm:px-7 lg:px-9">
        <BentoCard>
          {overview.isPending ? (
            <p role="status" className="text-sm text-[#5f5d55]">
              Cargando alumnos…
            </p>
          ) : overview.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-sm">No pudimos cargar las asignaciones.</p>
              <button
                type="button"
                onClick={() => void overview.refetch()}
                className="bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white"
              >
                Reintentar
              </button>
            </div>
          ) : alumnos.length === 0 ? (
            <p className="text-sm text-[#5f5d55]">
              Todavía no hay alumnos en el gimnasio.
            </p>
          ) : (
            <>
              <p className="eyebrow text-[#5f5d55]">
                {sinEntrenador === 0
                  ? 'Todos los alumnos tienen entrenador'
                  : `${String(sinEntrenador)} ${sinEntrenador === 1 ? 'alumno' : 'alumnos'} sin entrenador`}
              </p>
              {overview.data.trainers.length === 0 ? (
                <p className="mt-3 text-sm text-[#5f5d55]">
                  No hay entrenadores en el gimnasio. Invitá uno desde
                  Invitaciones.
                </p>
              ) : null}
              <ul
                aria-label="Alumnos"
                className="mt-4 overflow-hidden rounded-2xl border border-[#292823]/8"
              >
                {alumnos.map((student) => (
                  <FilaAlumno
                    key={student.studentId}
                    student={student}
                    trainers={overview.data.trainers}
                  />
                ))}
              </ul>
            </>
          )}
        </BentoCard>
      </main>
    </div>
  );
}
