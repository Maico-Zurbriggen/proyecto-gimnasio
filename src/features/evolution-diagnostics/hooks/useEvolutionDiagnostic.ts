import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getEvolutionDiagnostic,
  recalculateEvolutionDiagnostic,
} from '../../../api/evolutionDiagnostics';

export const evolutionDiagnosticKey = (studentId: string) =>
  ['evolution-diagnostic', studentId] as const;

export function useEvolutionDiagnostic(studentId: string) {
  return useQuery({
    queryKey: evolutionDiagnosticKey(studentId),
    queryFn: ({ signal }) => getEvolutionDiagnostic(studentId, { signal }),
    enabled: studentId.length > 0,
  });
}

export function useRecalculateEvolutionDiagnostic(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => recalculateEvolutionDiagnostic(studentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: evolutionDiagnosticKey(studentId),
      });
    },
  });
}
