import { z } from 'zod';

import { apiGet, apiPut } from './client';

/**
 * Contrato del panel de asignaciones del administrador (RF-066). Escrito a mano
 * hasta que el backend publique el cliente generado.
 */
const personSchema = z.object({ id: z.string(), displayName: z.string() });

export const assignmentsOverviewSchema = z.object({
  students: z.array(
    z.object({
      studentId: z.string(),
      displayName: z.string(),
      email: z.string(),
      trainer: personSchema.nullable(),
      assignedAt: z.string().nullable(),
    }),
  ),
  trainers: z.array(personSchema.extend({ studentCount: z.number().int() })),
});

const assignedSchema = z.object({
  studentId: z.string(),
  trainer: personSchema,
  previousTrainerId: z.string().nullable(),
  unblockedRoutines: z.number().int(),
  unblockedProposals: z.number().int(),
});

export type AssignmentsOverview = z.infer<typeof assignmentsOverviewSchema>;
export type AssignedTrainer = z.infer<typeof assignedSchema>;

export const assignmentsQueryKey = ['admin', 'assignments'] as const;

export async function fetchAssignments(
  signal?: AbortSignal,
): Promise<AssignmentsOverview> {
  return assignmentsOverviewSchema.parse(
    await apiGet('/admin/assignments', { signal }),
  );
}

export async function assignTrainer(
  studentId: string,
  trainerId: string,
): Promise<AssignedTrainer> {
  return assignedSchema.parse(
    await apiPut(`/admin/students/${encodeURIComponent(studentId)}/trainer`, {
      trainerId,
    }),
  );
}
