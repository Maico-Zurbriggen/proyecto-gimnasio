import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  assignRoutineFromTemplate,
  createManualRoutine,
  fetchRoutineContent,
  fetchRoutineTemplates,
  fetchStudentRoutines,
  reviewRoutine,
  studentRoutinesQueryKey,
  routineContentQueryKey,
  type ReviewResult,
  type WriteManualRoutine,
} from '../../../api/prescriptions';
import { activeRoutineQueryKey } from '../../routines/hooks/useActiveRoutine';
import { studentQueryKey } from '../../students/hooks/useStudentStatus';

export const routineTemplatesQueryKey = ['routine-templates'] as const;

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

/** Crea una rutina manual del entrenador: queda en PROPUESTA (HU16). */
export function useCreateManualRoutine(studentId: string) {
  const invalidate = useInvalidateRoutines(studentId);

  return useMutation({
    mutationFn: (input: WriteManualRoutine) =>
      createManualRoutine(studentId, input),
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
      reviewToken?: string;
    }) =>
      reviewRoutine(studentId, input.routineId, {
        result: input.result,
        observation: input.observation,
        reviewToken: input.reviewToken,
      }),
    onSuccess: invalidate,
  });
}
