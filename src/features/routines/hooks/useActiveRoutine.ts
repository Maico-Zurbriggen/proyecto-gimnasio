import { useQuery } from '@tanstack/react-query';

import { fetchActiveRoutine } from '../../../api/routines';

export const activeRoutineQueryKey = ['routines', 'active'] as const;

/**
 * Rutina vigente del alumno autenticado. `avisoRenovacion` es derivado y el
 * backend lo recalcula en cada consulta.
 */
export function useActiveRoutine() {
  return useQuery({
    queryKey: activeRoutineQueryKey,
    queryFn: ({ signal }) => fetchActiveRoutine(signal),
  });
}
