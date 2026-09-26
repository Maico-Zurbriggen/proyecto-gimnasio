import { useQuery } from '@tanstack/react-query';

import { fetchTrainerStudents } from '../../../api/students';

export const trainerStudentsQueryKey = ['trainers', 'me', 'students'] as const;

/** Cartera del entrenador autenticado (alumnos con asignación vigente). */
export function useTrainerStudents({ enabled = true } = {}) {
  return useQuery({
    queryKey: trainerStudentsQueryKey,
    queryFn: ({ signal }) => fetchTrainerStudents(signal),
    enabled,
  });
}
