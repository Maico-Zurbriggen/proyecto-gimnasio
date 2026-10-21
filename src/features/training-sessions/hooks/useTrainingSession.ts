import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../../../api/client';
import {
  abandonTrainingSession,
  fetchActiveTrainingSession,
  fetchTrainingSession,
  fetchTrainingSessions,
  finishTrainingSession,
  startTrainingSession,
  updateSeriesRecord,
  type HistoryStateFilter,
  type UpdateSeriesInput,
} from '../../../api/trainingSessions';

export const activeTrainingSessionQueryKey = [
  'training-sessions',
  'active',
] as const;

export function trainingHistoryQueryKey(
  studentId: string,
  state: HistoryStateFilter,
  page: number,
) {
  return ['training-sessions', 'history', studentId, state, page] as const;
}

/** Historial paginado del alumno (RF-035). */
export function useTrainingHistory(
  studentId: string,
  state: HistoryStateFilter,
  page: number,
) {
  return useQuery({
    queryKey: trainingHistoryQueryKey(studentId, state, page),
    queryFn: ({ signal }) =>
      fetchTrainingSessions(
        studentId,
        {
          ...(state === 'TODAS' ? {} : { state }),
          page,
          pageSize: 10,
        },
        signal,
      ),
  });
}

/** Detalle de una sesión del historial, bajo demanda. */
export function useTrainingSessionDetail(
  studentId: string,
  sessionId: string | null,
) {
  return useQuery({
    queryKey: ['training-sessions', 'detail', studentId, sessionId],
    queryFn: ({ signal }) =>
      fetchTrainingSession(studentId, sessionId ?? '', signal),
    enabled: sessionId !== null,
  });
}

/** Sesión EN_CURSO para reanudar en el punto exacto (FL-07). */
export function useActiveTrainingSession() {
  return useQuery({
    queryKey: activeTrainingSessionQueryKey,
    queryFn: ({ signal }) => fetchActiveTrainingSession(signal),
    retry: false,
  });
}

/** Iniciar sobre el día elegido (FL-05, RN-50 a RN-52). */
export function useStartTrainingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { studentId: string; routineDayId?: string }) =>
      startTrainingSession(input.studentId, {
        routineDayId: input.routineDayId,
      }),
    onSuccess: async (session) => {
      queryClient.setQueryData(activeTrainingSessionQueryKey, session);
    },
  });
}

/** Registrar una serie; cada escritura renueva la actividad (RN-53). */
export function useUpdateSeriesRecord(studentId: string, sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    // `position` va en la URL: no debe viajar en el cuerpo (schema estricto).
    mutationFn: ({
      position,
      ...series
    }: { position: number } & UpdateSeriesInput) =>
      updateSeriesRecord(studentId, sessionId, position, series),
    // RNF-10: reintenta sólo fallos de red o 5xx. El registro es idempotente
    // por (sesión, orden) y un 4xx no se arregla reintentando (RNF-13).
    retry: (failureCount, error) =>
      failureCount < 2 && (!(error instanceof ApiError) || error.status >= 500),
    retryDelay: 500,
    onSuccess: async (session) => {
      queryClient.setQueryData(activeTrainingSessionQueryKey, session);
    },
  });
}

/** Cierre manual a COMPLETADA (D6/§4, RF-027). */
export function useFinishTrainingSession(studentId: string, sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => finishTrainingSession(studentId, sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: activeTrainingSessionQueryKey,
      });
    },
  });
}

/** Descartar a ABANDONADA conservando lo registrado (FL-07 A1). */
export function useAbandonTrainingSession(
  studentId: string,
  sessionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => abandonTrainingSession(studentId, sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: activeTrainingSessionQueryKey,
      });
    },
  });
}
