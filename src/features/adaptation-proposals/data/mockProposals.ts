import type { AdaptationProposalReview } from '../types';

export interface MockProposal extends AdaptationProposalReview {
  studentName: string;
}

/** Referencia mientras no exista el endpoint real de HU04-T1. */
export const MOCK_PROPOSALS: MockProposal[] = [
  {
    id: 'propuesta-juan-perez',
    studentName: 'Juan Pérez',
    sinDatosActualizados: true,
    datoFaltante: 'peso y altura posteriores al inicio del ciclo',
  },
];

export function findMockProposal(
  id: string | undefined,
): MockProposal | undefined {
  return MOCK_PROPOSALS.find((proposal) => proposal.id === id);
}
