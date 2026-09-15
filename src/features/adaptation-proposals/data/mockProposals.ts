import type { AdaptationProposalReview } from '../types';

export interface MockProposal extends AdaptationProposalReview {
  studentName: string;
}

/**
 * Referencia mientras el backend no exponga la ruta de revisión de HU04-T1.
 * Respeta el formato y los textos de `AdvertenciaDatosDesactualizadosDto`.
 */
export const MOCK_PROPOSALS: MockProposal[] = [
  {
    id: 'propuesta-juan-perez',
    studentName: 'Juan Pérez',
    sinDatosActualizados: true,
    datoFaltante: 'medicion corporal posterior al inicio del ciclo',
    faltasConsecutivas: 3,
    alcanzoTopeDeFaltas: true,
  },
];

export function findMockProposal(
  id: string | undefined,
): MockProposal | undefined {
  return MOCK_PROPOSALS.find((proposal) => proposal.id === id);
}
