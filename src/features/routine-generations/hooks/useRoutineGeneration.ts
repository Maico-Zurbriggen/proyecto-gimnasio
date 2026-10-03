import { useQuery } from '@tanstack/react-query';

import {
  fetchRoutineGeneration,
  isTerminalGenerationStatus,
} from '../../../api/routineGenerations';

export const routineGenerationQueryKey = (
  studentId: string,
  requestId: string,
) => ['students', studentId, 'routine-generations', requestId] as const;

/** Polling recuperable que se detiene al alcanzar cualquier estado terminal. */
export function useRoutineGeneration(
  studentId: string,
  requestId: string | undefined,
) {
  return useQuery({
    queryKey: routineGenerationQueryKey(studentId, requestId ?? ''),
    queryFn: ({ signal }) =>
      fetchRoutineGeneration(studentId, requestId ?? '', signal),
    enabled: Boolean(studentId && requestId),
    refetchInterval: (query) => {
      if (query.state.error) return false;
      const snapshot = query.state.data;
      return snapshot && isTerminalGenerationStatus(snapshot.status)
        ? false
        : 3_000;
    },
    refetchIntervalInBackground: false,
  });
}
