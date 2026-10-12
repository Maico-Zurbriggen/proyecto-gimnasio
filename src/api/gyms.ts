import { z } from 'zod';

import { apiGet, apiPost } from './client';

/**
 * Contrato del aprovisionamiento de gimnasios (HU13), sólo para el SuperAdmin.
 * Escrito a mano hasta que el backend publique el cliente generado.
 */
export const bootstrapInvitationStatusSchema = z.enum([
  'PENDIENTE',
  'USADA',
  'VENCIDA',
  'REVOCADA',
]);

export const gymSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  timezone: z.string(),
  status: z.enum(['ACTIVO', 'INACTIVO']),
  createdAt: z.string(),
  administratorCount: z.number().int(),
  bootstrapInvitation: z
    .object({
      email: z.string(),
      status: bootstrapInvitationStatusSchema,
      expiresAt: z.string(),
    })
    .nullable(),
});

export const provisionedGymSchema = z.object({
  id: z.string(),
  name: z.string(),
  timezone: z.string(),
  createdAt: z.string(),
  invitationSentTo: z.string(),
  invitationExpiresAt: z.string(),
});

const reissuedInvitationSchema = z.object({
  invitationSentTo: z.string(),
  invitationExpiresAt: z.string(),
});

export type GymSummary = z.infer<typeof gymSummarySchema>;
export type ProvisionedGym = z.infer<typeof provisionedGymSchema>;
export type BootstrapInvitationStatus = z.infer<
  typeof bootstrapInvitationStatusSchema
>;

export interface ProvisionGymInput {
  nombre: string;
  zonaHoraria: string;
  correoAdministrador: string;
}

export const gymsQueryKey = ['platform', 'gyms'] as const;
export const timezonesQueryKey = ['platform', 'timezones'] as const;

export async function fetchGyms(signal?: AbortSignal): Promise<GymSummary[]> {
  return z
    .array(gymSummarySchema)
    .parse(await apiGet('/platform/gyms', { signal }));
}

export async function fetchTimezones(signal?: AbortSignal): Promise<string[]> {
  return z
    .array(z.string())
    .parse(await apiGet('/platform/timezones', { signal }));
}

export async function provisionGym(
  input: ProvisionGymInput,
): Promise<ProvisionedGym> {
  return provisionedGymSchema.parse(await apiPost('/platform/gyms', input));
}

export async function reissueBootstrapInvitation(
  gymId: string,
): Promise<z.infer<typeof reissuedInvitationSchema>> {
  return reissuedInvitationSchema.parse(
    await apiPost(
      `/platform/gyms/${encodeURIComponent(gymId)}/bootstrap-invitation`,
      {},
    ),
  );
}
