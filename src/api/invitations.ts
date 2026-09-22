import { z } from 'zod';

import { authenticatedUserSchema } from './auth';
import { apiGet, apiPost } from './client';

/**
 * Contrato de los endpoints de invitación del backend (HU06). Escrito a mano
 * hasta que el backend publique OpenAPI.
 */
export const validatedInvitationSchema = z.object({
  id: z.string(),
  gymId: z.string(),
  gymName: z.string(),
  email: z.string(),
  roles: z.array(z.enum(['ALUMNO', 'ENTRENADOR', 'ADMINISTRADOR'])),
  /** Vencimiento de la invitación, en ISO 8601. */
  expiresAt: z.string(),
});

/**
 * Respuesta del completado. Misma forma que el login: el usuario y el
 * vencimiento de la sesión. El token no viaja en el cuerpo, va en la cookie
 * httpOnly que emite el backend (RNF-16).
 */
export const completedAccountSchema = z.object({
  user: authenticatedUserSchema,
  expiresAt: z.string(),
});

export type ValidatedInvitation = z.infer<typeof validatedInvitationSchema>;
export type CompletedAccount = z.infer<typeof completedAccountSchema>;

export interface CompleteAccountInput {
  displayName: string;
  password: string;
}

/** `GET /invitations/:token`: estado de la invitación (HU06-T1 y T6). */
export async function fetchInvitation(
  token: string,
  signal?: AbortSignal,
): Promise<ValidatedInvitation> {
  const body = await apiGet(`/invitations/${encodeURIComponent(token)}`, {
    signal,
  });
  return validatedInvitationSchema.parse(body);
}

/**
 * `POST /invitations/:token/complete`: crea la cuenta y abre la sesión
 * (HU06-T2, T3 y T4).
 */
export async function completeInvitationAccount(
  token: string,
  input: CompleteAccountInput,
): Promise<CompletedAccount> {
  const body = await apiPost(
    `/invitations/${encodeURIComponent(token)}/complete`,
    input,
  );
  return completedAccountSchema.parse(body);
}
