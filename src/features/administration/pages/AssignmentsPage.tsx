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
    <li className="flex flex-col gap-3 rounded-2xl border border-[#292823]/8 bg-white/70 p-4 hover:border-[#292823]/15 hover:bg-white lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-bold">{student.displayName}</p>
        <p className="mt-0.5 text-xs break-all text-[#77756d]">
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
            className="field w-auto"
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
            className="btn-primary btn-sm"
          >
            {asignar.isPending
              ? 'Guardando…'
              : student.trainer
                ? 'Cambiar'
                : 'Asignar'}
          </button>
        </div>
        <p aria-live="polite" className="text-xs text-[#68675f]">
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
      <main className="page-body">
        <BentoCard>
          {overview.isPending ? (
            <p role="status" className="text-sm text-[#77756d]">
              Cargando alumnos…
            </p>
          ) : overview.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-sm">No pudimos cargar las asignaciones.</p>
              <button
                type="button"
                onClick={() => void overview.refetch()}
                className="btn-secondary btn-sm"
              >
                Reintentar
              </button>
            </div>
          ) : alumnos.length === 0 ? (
            <p className="text-sm text-[#77756d]">
              Todavía no hay alumnos en el gimnasio.
            </p>
          ) : (
            <>
              <p className="eyebrow text-[#77756d]">
                {sinEntrenador === 0
                  ? 'Todos los alumnos tienen entrenador'
                  : `${String(sinEntrenador)} ${sinEntrenador === 1 ? 'alumno' : 'alumnos'} sin entrenador`}
              </p>
              {overview.data.trainers.length === 0 ? (
                <p className="mt-3 text-sm text-[#77756d]">
                  No hay entrenadores en el gimnasio. Invitá uno desde
                  Invitaciones.
                </p>
              ) : null}
              <ul aria-label="Alumnos" className="mt-4 flex flex-col gap-3">
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
