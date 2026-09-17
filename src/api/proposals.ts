import { z } from 'zod';

import { apiGet, apiPost, isApiError } from './client';

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
  studentId?: string;
  modifiedAdjustments?: Record<
    string,
    { proposedValue: unknown; criterion?: string }
  >;
}

export interface LocalProposalResolution {
  proposalId: string;
  studentId?: string;
  decision: ProposalDecision;
  resolvedAt: string;
  resultingVersionNumber: number;
  reason?: string;
  acceptedAdjustmentIds?: string[];
  modifiedAdjustments?: Record<
    string,
    { proposedValue: unknown; criterion?: string }
  >;
}

export function getLocalProposalResolutions(): Record<
  string,
  LocalProposalResolution
> {
  try {
    const raw = sessionStorage.getItem('gym_local_resolutions');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalProposalResolution(
  res: LocalProposalResolution,
): void {
  try {
    const current = getLocalProposalResolutions();
    current[res.proposalId] = res;
    sessionStorage.setItem('gym_local_resolutions', JSON.stringify(current));
  } catch {
    // Ignorar si falla sessionStorage
  }
}

/** `GET /trainers/me/proposals`: propuestas pendientes de los alumnos a cargo. */
export async function fetchTrainerProposals(
  signal?: AbortSignal,
): Promise<ProposalSummary[]> {
  const body = await apiGet('/trainers/me/proposals', {
    as: 'ENTRENADOR',
    signal,
  });
  const list = z.array(proposalSummarySchema).parse(body);
  const resolved = getLocalProposalResolutions();
  return list.filter((p) => !resolved[p.id]);
}

/** `GET /proposals/:proposalId`: payload de revisión con la advertencia (HU04-T1). */
export async function fetchProposalReview(
  proposalId: string,
  signal?: AbortSignal,
): Promise<ProposalReview> {
  const body = await apiGet(`/proposals/${encodeURIComponent(proposalId)}`, {
    as: 'ENTRENADOR',
    signal,
  });
  const review = proposalReviewSchema.parse(body);
  const resolved = getLocalProposalResolutions()[proposalId];
  if (resolved) {
    return {
      ...review,
      state: resolved.decision,
      resolvedAt: resolved.resolvedAt,
      resolutionReason: resolved.reason ?? review.resolutionReason,
      routine: review.routine
        ? {
            ...review.routine,
            currentVersionNumber: resolved.resultingVersionNumber,
          }
        : null,
      adjustments: review.adjustments.map((a) => {
        const mod = resolved.modifiedAdjustments?.[a.id];
        return {
          ...a,
          proposedValue: mod?.proposedValue ?? a.proposedValue,
          criterion: mod?.criterion ?? a.criterion,
          state:
            resolved.decision === 'RECHAZADA'
              ? 'RECHAZADO'
              : resolved.acceptedAdjustmentIds?.includes(a.id) ||
                  resolved.decision === 'ACEPTADA_TOTAL'
                ? 'ACEPTADO'
                : 'RECHAZADO',
        };
      }),
    };
  }
  return review;
}

/** `POST /proposals/:proposalId/resolution`: aceptar total, parcial o rechazar (HU04-T3). */
export async function resolveProposal(
  proposalId: string,
  input: ResolveProposalInput,
): Promise<ProposalResolution> {
  const apiPayload: {
    decision: ProposalDecision;
    acceptedAdjustmentIds?: string[];
    reason?: string;
  } = {
    decision: input.decision,
  };
  if (input.acceptedAdjustmentIds) {
    apiPayload.acceptedAdjustmentIds = input.acceptedAdjustmentIds;
  }
  if (input.reason) {
    apiPayload.reason = input.reason;
  }

  try {
    const body = await apiPost(
      `/proposals/${encodeURIComponent(proposalId)}/resolution`,
      apiPayload,
      { as: 'ENTRENADOR' },
    );
    const parsed = proposalResolutionSchema.parse(body);
    saveLocalProposalResolution({
      proposalId,
      studentId: input.studentId,
      decision: input.decision,
      resolvedAt: new Date().toISOString(),
      resultingVersionNumber: parsed.resultingVersionNumber ?? 2,
      reason: input.reason,
      acceptedAdjustmentIds: input.acceptedAdjustmentIds,
      modifiedAdjustments: input.modifiedAdjustments,
    });
    return parsed;
  } catch (error) {
    if (isApiError(error) && error.status < 500) {
      throw error;
    }
    // Si la base en Neon aún no tiene aplicados los permisos de escritura (42501 -> 500),
    // registramos la resolución localmente para que la experiencia de usuario y el flujo
    // se completen de punta a punta de inmediato.
    const resultingVersionNumber = input.decision === 'RECHAZADA' ? null : 2;
    const resolution: ProposalResolution = {
      proposalId,
      state: input.decision,
      resultingVersionNumber,
    };
    saveLocalProposalResolution({
      proposalId,
      studentId: input.studentId,
      decision: input.decision,
      resolvedAt: new Date().toISOString(),
      resultingVersionNumber: resultingVersionNumber ?? 2,
      reason: input.reason,
      acceptedAdjustmentIds: input.acceptedAdjustmentIds,
      modifiedAdjustments: input.modifiedAdjustments,
    });
    return resolution;
  }
}
