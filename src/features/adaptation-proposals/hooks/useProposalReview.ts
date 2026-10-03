import { useQuery } from '@tanstack/react-query';

import { fetchProposalReview } from '../../../api/proposals';

export function proposalQueryKey(proposalId: string) {
  return ['proposals', proposalId] as const;
}

/** Payload de revisión de una propuesta con la advertencia de datos (HU04-T1). */
export function useProposalReview(proposalId: string) {
  return useQuery({
    queryKey: proposalQueryKey(proposalId),
    queryFn: ({ signal }) => fetchProposalReview(proposalId, signal),
    enabled: proposalId.length > 0,
  });
}
