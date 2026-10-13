import { z } from 'zod';

import { authenticatedUserSchema } from './auth';
import { apiDelete, apiGet, apiPost } from './client';

/**
 * Contrato de los endpoints de invitación del backend (HU06). Escrito a mano
 * hasta que el backend publique OpenAPI.
 */
export const validatedInvitationSchema = z.object({
  gymName: z.string(),
  email: z.string(),
  roles: z.array(z.enum(['ALUMNO', 'ENTRENADOR', 'ADMINISTRADOR'])),
  /** Vencimiento de la invitación, en ISO 8601. */
  expiresAt: z.string(),
  /** Profesor que va a tener el alumno, si lo invitó un entrenador. */
  trainerName: z.string().nullable().default(null),
  /** Texto del consentimiento de datos de salud (sólo si se invita a un alumno). */
  healthConsentText: z.string().nullable().default(null),
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
  /** FL-19/3: separado y opcional. */
  healthDataConsent?: boolean;
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

const invitableRoleSchema = z.enum(['ALUMNO', 'ENTRENADOR', 'ADMINISTRADOR']);
export type InvitableRole = z.infer<typeof invitableRoleSchema>;

/** Estado de una invitación emitida (HU08 - criterio 15). */
export const invitationStatusSchema = z.enum([
  'VIGENTE',
  'USADA',
  'REVOCADA',
  'CADUCADA',
]);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

export const issuedInvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  roles: z.array(invitableRoleSchema),
  status: invitationStatusSchema,
  issuedAt: z.string(),
  expiresAt: z.string(),
  trainerName: z.string().nullable(),
  /** Criterio 18: el correo no salió; la invitación sigue vigente. */
  emailFailed: z.boolean(),
});

export const listedInvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  roles: z.array(invitableRoleSchema),
  status: invitationStatusSchema,
  issuedAt: z.string(),
  expiresAt: z.string(),
  issuedByName: z.string().nullable(),
});

export type IssuedInvitation = z.infer<typeof issuedInvitationSchema>;
export type ListedInvitation = z.infer<typeof listedInvitationSchema>;

export const invitationsQueryKey = ['invitations'] as const;

/** `POST /invitations`: emite la invitación y envía el enlace por correo. */
export async function issueInvitation(input: {
  email: string;
  roles: InvitableRole[];
}): Promise<IssuedInvitation> {
  return issuedInvitationSchema.parse(await apiPost('/invitations', input));
}

/** `GET /invitations`: las del gimnasio (admin) o las propias (entrenador). */
export async function fetchInvitations(
  signal?: AbortSignal,
): Promise<ListedInvitation[]> {
  return z
    .array(listedInvitationSchema)
    .parse(await apiGet('/invitations', { signal }));
}

/** `DELETE /invitations/:id`: revoca una invitación vigente (HU08 - T2). */
export async function revokeInvitation(invitationId: string): Promise<void> {
  await apiDelete(`/invitations/${encodeURIComponent(invitationId)}`);
}

/** `POST /invitations/:id/resend`: reenvía con un token nuevo (HU08 - T4). */
export async function resendInvitation(
  invitationId: string,
): Promise<{ emailFailed: boolean; expiresAt: string }> {
  return z
    .object({ emailFailed: z.boolean(), expiresAt: z.string() })
    .parse(
      await apiPost(
        `/invitations/${encodeURIComponent(invitationId)}/resend`,
        {},
      ),
    );
}
