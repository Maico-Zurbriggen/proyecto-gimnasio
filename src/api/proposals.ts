import { z } from 'zod';

import { apiGet, apiPost } from './client';

/**
 * Contrato de los endpoints de propuestas de adaptación del backend (HU04).
 * Escrito a mano hasta que el backend publique OpenAPI.
 */
export const advertenciaDatosSchema = z.object({
  sinDatosActualizados: z.boolean(),
  datoFaltante: z.string().optional(),
  faltasConsecutivas: z.number().int(),
  alcanzoTopeDeFaltas: z.boolean(),
});

export const proposalAdjustmentSchema = z.object({
  id: z.string(),
  type: z.enum(['CARGA', 'VOLUMEN', 'ESQUEMA', 'SUSTITUCION', 'ESTRUCTURA']),
  routineExerciseId: z.string().nullable(),
  exerciseName: z.string().nullable(),
  criterion: z.string(),
  previousValue: z.unknown(),
  proposedValue: z.unknown(),
  supportingData: z.unknown(),
  state: z.enum(['PENDIENTE', 'ACEPTADO', 'RECHAZADO']),
});

const studentRefSchema = z.object({
  id: z.string(),
  displayName: z.string(),
});

export const proposalSummarySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  student: studentRefSchema,
  globalSituation: z.string(),
  adjustmentsCount: z.number().int(),
  advertenciaDatos: advertenciaDatosSchema,
});

export const proposalReviewSchema = z.object({
  id: z.string(),
  state: z.string(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolutionReason: z.string().nullable(),
  student: studentRefSchema,
  routine: z
    .object({
      id: z.string(),
      routineType: z.string(),
      currentVersionNumber: z.number().int().nullable(),
    })
    .nullable(),
  diagnostic: z.object({
    periodStart: z.string(),
    periodEnd: z.string(),
    globalSituation: z.string(),
    adherence: z.number().nullable(),
  }),
  adjustments: z.array(proposalAdjustmentSchema),
  advertenciaDatos: advertenciaDatosSchema,
});

export const proposalDecisionSchema = z.enum([
  'ACEPTADA_TOTAL',
  'ACEPTADA_PARCIAL',
  'RECHAZADA',
]);

export const proposalResolutionSchema = z.object({
  proposalId: z.string(),
  state: z.string(),
  resultingVersionNumber: z.number().int().nullable(),
});

export type AdvertenciaDatos = z.infer<typeof advertenciaDatosSchema>;
export type ProposalAdjustment = z.infer<typeof proposalAdjustmentSchema>;
export type ProposalSummary = z.infer<typeof proposalSummarySchema>;
export type ProposalReview = z.infer<typeof proposalReviewSchema>;
export type ProposalDecision = z.infer<typeof proposalDecisionSchema>;
export type ProposalResolution = z.infer<typeof proposalResolutionSchema>;

export interface ResolveProposalInput {
  decision: ProposalDecision;
  acceptedAdjustmentIds?: string[];
  reason?: string;
}

/** `GET /trainers/me/proposals`: propuestas pendientes de los alumnos a cargo. */
export async function fetchTrainerProposals(
  signal?: AbortSignal,
): Promise<ProposalSummary[]> {
  const body = await apiGet('/trainers/me/proposals', { signal });
  return z.array(proposalSummarySchema).parse(body);
}

/** `GET /proposals/:proposalId`: payload de revisión con la advertencia (HU04-T1). */
export async function fetchProposalReview(
  proposalId: string,
  signal?: AbortSignal,
): Promise<ProposalReview> {
  const body = await apiGet(`/proposals/${encodeURIComponent(proposalId)}`, {
    signal,
  });
  return proposalReviewSchema.parse(body);
}

/** `POST /proposals/:proposalId/resolution`: aceptar total, parcial o rechazar (HU04-T3). */
export async function resolveProposal(
  proposalId: string,
  input: ResolveProposalInput,
): Promise<ProposalResolution> {
  const body = await apiPost(
    `/proposals/${encodeURIComponent(proposalId)}/resolution`,
    input,
  );
  return proposalResolutionSchema.parse(body);
}
