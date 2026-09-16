import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  resolveProposal,
  type ResolveProposalInput,
} from '../../../api/proposals';
import { proposalQueryKey } from './useProposalReview';
import { trainerProposalsQueryKey } from './useTrainerProposals';

/** Aceptación total, parcial o rechazo de una propuesta (HU04-T3). */
export function useResolveProposal(proposalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResolveProposalInput) =>
      resolveProposal(proposalId, input),
    onSuccess: async () => {
      // La resolución cambia la propuesta, la cartera y la rutina vigente del alumno.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: proposalQueryKey(proposalId),
        }),
        queryClient.invalidateQueries({ queryKey: trainerProposalsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['trainers', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['students'] }),
      ]);
    },
  });
}
