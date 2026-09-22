import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  assignRoutineFromTemplate,
  fetchRoutineContent,
  fetchRoutineTemplates,
  fetchStudentRoutines,
  reviewRoutine,
  type ReviewResult,
} from '../../../api/prescriptions';
import { activeRoutineQueryKey } from '../../routines/hooks/useActiveRoutine';
import { studentQueryKey } from '../../students/hooks/useStudentStatus';

export const routineTemplatesQueryKey = ['routine-templates'] as const;

export function studentRoutinesQueryKey(studentId: string) {
  return ['student-routines', studentId] as const;
}

export function routineContentQueryKey(studentId: string, routineId: string) {
  return ['routine-content', studentId, routineId] as const;
}

/** Plantillas que el entrenador puede asignar. */
export function useRoutineTemplates() {
  return useQuery({
    queryKey: routineTemplatesQueryKey,
    queryFn: ({ signal }) => fetchRoutineTemplates(signal),
    staleTime: 5 * 60 * 1000,
  });
}

/** Rutinas del alumno: la vigente, la propuesta y las archivadas. */
export function useStudentRoutines(studentId: string) {
  return useQuery({
    queryKey: studentRoutinesQueryKey(studentId),
    queryFn: ({ signal }) => fetchStudentRoutines(studentId, signal),
    enabled: studentId.length > 0,
  });
}

/** Contenido de una rutina. Se pide sólo cuando hay una rutina que mostrar. */
export function useRoutineContent(
  studentId: string,
  routineId: string | undefined,
) {
  return useQuery({
    queryKey: routineContentQueryKey(studentId, routineId ?? ''),
    queryFn: ({ signal }) =>
      fetchRoutineContent(studentId, routineId ?? '', signal),
    enabled: studentId.length > 0 && Boolean(routineId),
  });
}

/**
 * Invalida todo lo que cambia cuando una rutina se asigna o se revisa: el
 * listado del alumno, la rutina vigente que ve el entrenador en la ficha y la
 * que ve el alumno con su aviso de renovación.
 */
function useInvalidateRoutines(studentId: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: studentRoutinesQueryKey(studentId),
      }),
      queryClient.invalidateQueries({
        queryKey: [...studentQueryKey(studentId), 'routines', 'active'],
      }),
      queryClient.invalidateQueries({ queryKey: activeRoutineQueryKey }),
    ]);
  };
}

/** Asigna una plantilla: la rutina queda en PROPUESTA. */
export function useAssignRoutine(studentId: string) {
  const invalidate = useInvalidateRoutines(studentId);

  return useMutation({
    mutationFn: (templateId: string) =>
      assignRoutineFromTemplate(studentId, templateId),
    onSuccess: invalidate,
  });
}

/** Aprueba o rechaza la rutina propuesta. */
export function useReviewRoutine(studentId: string) {
  const invalidate = useInvalidateRoutines(studentId);

  return useMutation({
    mutationFn: (input: {
      routineId: string;
      result: ReviewResult;
      observation?: string;
    }) =>
      reviewRoutine(studentId, input.routineId, {
        result: input.result,
        observation: input.observation,
      }),
    onSuccess: invalidate,
  });
}
