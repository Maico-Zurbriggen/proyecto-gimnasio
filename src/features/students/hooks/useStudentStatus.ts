import { useQuery } from '@tanstack/react-query';

import { fetchStudentStatus } from '../../../api/students';

/** Prefijo común de todo lo consultado sobre un alumno (estado, rutina vigente). */
export function studentQueryKey(studentId: string | undefined) {
  return ['students', studentId] as const;
}

/** Estado de bloqueo del alumno para la ficha del entrenador (HU05-T2). */
export function useStudentStatus(studentId: string | undefined) {
  return useQuery({
    queryKey: [...studentQueryKey(studentId), 'status'],
    queryFn: ({ signal }) => fetchStudentStatus(studentId ?? '', signal),
    enabled: Boolean(studentId),
  });
}
