import { useQuery } from '@tanstack/react-query';

import { fetchRoutineHistory } from '../../../api/routineHistory';

export const routineHistoryQueryKey = (studentId: string) =>
  ['students', studentId, 'routine-history'] as const;

export function useRoutineHistory(studentId: string) {
  return useQuery({
    queryKey: routineHistoryQueryKey(studentId),
    queryFn: ({ signal }) => fetchRoutineHistory(studentId, signal),
    enabled: Boolean(studentId),
  });
}
