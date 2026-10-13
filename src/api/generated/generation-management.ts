// Generated from Backend/openapi/generation-management.openapi.json. Do not edit.
import { z } from 'zod';

export const generationSettingsSchema = z.object({
  minExercisesPerDay: z.number().int(),
  maxExercisesPerDay: z.number().int(),
  minWorkSetsPerExercise: z.number().int(),
  maxWorkSetsPerExercise: z.number().int(),
  minRepetitions: z.number().int(),
  maxRepetitions: z.number().int(),
  minRestSeconds: z.number().int(),
  maxRestSeconds: z.number().int(),
  warmupSetsPerExercise: z.number().int(),
});
export type GenerationSettings = z.infer<typeof generationSettingsSchema>;

export const generationSettingsSnapshotSchema = z.object({
  settings: z.union([
    z.object({
      minExercisesPerDay: z.number().int(),
      maxExercisesPerDay: z.number().int(),
      minWorkSetsPerExercise: z.number().int(),
      maxWorkSetsPerExercise: z.number().int(),
      minRepetitions: z.number().int(),
      maxRepetitions: z.number().int(),
      minRestSeconds: z.number().int(),
      maxRestSeconds: z.number().int(),
      warmupSetsPerExercise: z.number().int(),
    }),
    z.null(),
  ]),
  revision: z.number().int(),
});
export type GenerationSettingsSnapshot = z.infer<
  typeof generationSettingsSnapshotSchema
>;

export const regenerateProposalInputSchema = z.object({
  feedback: z.string(),
  idempotencyKey: z.string(),
  candidateRequestId: z.string(),
});
export type RegenerateProposalInput = z.infer<
  typeof regenerateProposalInputSchema
>;

export const proposalRegenerationSchema = z.object({
  id: z.string(),
  proposalId: z.string(),
  trainerId: z.string(),
  feedback: z.string(),
  candidateRequestId: z.string(),
  requestId: z.union([z.string(), z.null()]),
  state: z.enum(['PENDIENTE', 'COMPLETADA', 'NO_DISPONIBLE']),
  error: z.union([z.string(), z.null()]),
});
export type ProposalRegeneration = z.infer<typeof proposalRegenerationSchema>;

export const proposalRegenerationReferenceSchema = z.object({
  candidateRequestId: z.string(),
});
export type ProposalRegenerationReference = z.infer<
  typeof proposalRegenerationReferenceSchema
>;
