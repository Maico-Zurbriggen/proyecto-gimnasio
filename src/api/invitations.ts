import { z } from 'zod';

import { apiGet, apiPost } from './client';

export const validatedInvitationSchema = z.object({
  id: z.string().uuid(),
  gymId: z.string().uuid(),
  gymName: z.string(),
  email: z.string().email(),
  roles: z.array(z.string()),
  expiresAt: z.string(),
});

export type ValidatedInvitation = z.infer<typeof validatedInvitationSchema>;

export interface CompleteAccountData {
  displayName: string;
  password: string;
}

export const completedAccountResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string().uuid(),
    gymId: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string(),
    roles: z.array(z.string()),
  }),
});

export type CompletedAccountResponse = z.infer<
  typeof completedAccountResponseSchema
>;

/**
 * HU06 - T1 & T6: Valida un token de invitación.
 */
export async function getInvitation(
  token: string,
  signal?: AbortSignal,
): Promise<ValidatedInvitation> {
  const data = await apiGet(`/invitations/${encodeURIComponent(token)}`, {
    signal,
  });
  return validatedInvitationSchema.parse(data);
}

/**
 * HU06 - T2, T3 & T4: Completa la cuenta a partir del enlace de invitación.
 */
export async function completeInvitationAccount(
  token: string,
  data: CompleteAccountData,
  signal?: AbortSignal,
): Promise<CompletedAccountResponse> {
  const result = await apiPost(
    `/invitations/${encodeURIComponent(token)}/complete`,
    data,
    { signal },
  );
  return completedAccountResponseSchema.parse(result);
}
