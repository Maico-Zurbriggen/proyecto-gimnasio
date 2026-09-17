import { useQuery } from '@tanstack/react-query';

import { fetchTrainerProposals } from '../../../api/proposals';

export const trainerProposalsQueryKey = [
  'trainers',
  'me',
  'proposals',
] as const;

/** Propuestas pendientes de los alumnos a cargo del entrenador. */
export function useTrainerProposals(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: trainerProposalsQueryKey,
    queryFn: ({ signal }) => fetchTrainerProposals(signal),
    enabled: options?.enabled,
  });
}
