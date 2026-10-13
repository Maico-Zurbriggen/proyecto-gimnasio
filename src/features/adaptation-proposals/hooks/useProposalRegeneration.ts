import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchProposalRegeneration,
  regenerateProposal,
} from '../../../api/proposals';
import { proposalQueryKey } from './useProposalReview';

export function useProposalRegeneration(proposalId: string, enabled: boolean) {
  const client = useQueryClient();
  const key = ['proposal-regeneration', proposalId] as const;
  const status = useQuery({
    queryKey: key,
    enabled,
    queryFn: ({ signal }) => fetchProposalRegeneration(proposalId, signal),
    refetchInterval: (query) =>
      query.state.data?.state === 'PENDIENTE' ? 3000 : false,
  });
  const start = useMutation({
    mutationFn: (input: {
      feedback: string;
      candidateRequestId: string;
      idempotencyKey: string;
    }) => regenerateProposal(proposalId, input),
    onSuccess: (data) => client.setQueryData(key, data),
  });
  const state = status.data?.state;
  const requestId = status.data?.requestId;
  useEffect(() => {
    if (state === 'COMPLETADA')
      void client.invalidateQueries({ queryKey: proposalQueryKey(proposalId) });
  }, [state, requestId, client, proposalId]);
  return {
    status,
    start,
    busy:
      enabled &&
      (status.isPending ||
        !!status.error ||
        start.isPending ||
        state === 'PENDIENTE'),
  };
}
