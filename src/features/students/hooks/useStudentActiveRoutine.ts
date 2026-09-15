import { useQuery } from '@tanstack/react-query';

import { fetchStudentActiveRoutine } from '../../../api/routines';

/** Rutina vigente de un alumno de la cartera, consultada como ENTRENADOR. */
export function useStudentActiveRoutine(studentId: string | undefined) {
  return useQuery({
    queryKey: ['students', studentId, 'routines', 'active'],
    queryFn: ({ signal }) => fetchStudentActiveRoutine(studentId ?? '', signal),
    enabled: Boolean(studentId),
  });
}
