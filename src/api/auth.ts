import { z } from 'zod';

import { apiGet, apiPost, type ApiRole } from './client';

/**
 * Contrato de los endpoints de sesión del backend (HU07). Escrito a mano hasta
 * que el backend publique OpenAPI.
 */
export const authenticatedUserSchema = z.object({
  id: z.string(),
  gymId: z.string(),
  roles: z.array(z.enum(['ALUMNO', 'ENTRENADOR', 'ADMINISTRADOR'])),
});

export const loginResponseSchema = z.object({
  user: authenticatedUserSchema,
  /** Instante en que vence la sesión, en ISO 8601. */
  expiresAt: z.string(),
});

export const sessionResponseSchema = z.object({
  user: authenticatedUserSchema,
});

export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Rol con el que se consultan los endpoints de sesión.
 *
 * `/auth/login` y `/auth/logout` son públicos y `/auth/me` resuelve la identidad
 * desde la cookie, así que el rol sólo alimenta el atajo de desarrollo del
 * cliente HTTP y no condiciona la respuesta.
 */
const AUTH_ROLE: ApiRole = 'ALUMNO';

/** `POST /auth/login`: inicia sesión y deja la cookie httpOnly (HU07-T1). */
export async function login(input: LoginInput): Promise<LoginResponse> {
  const body = await apiPost('/auth/login', input, { as: AUTH_ROLE });
  return loginResponseSchema.parse(body);
}

/** `POST /auth/logout`: revoca la sesión y limpia la cookie (HU07-T4). */
export async function logout(): Promise<void> {
  await apiPost('/auth/logout', undefined, { as: AUTH_ROLE });
}

/** `GET /auth/me`: identidad de la sesión en curso (HU07-T2). */
export async function fetchSession(
  signal?: AbortSignal,
): Promise<AuthenticatedUser> {
  const body = await apiGet('/auth/me', { as: AUTH_ROLE, signal });
  return sessionResponseSchema.parse(body).user;
}
