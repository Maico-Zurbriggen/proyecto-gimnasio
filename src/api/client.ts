const DEFAULT_API_URL = 'http://localhost:3000';

/** Roles que reconoce el backend (`UserRole` en `shared/types/auth.ts`). */
export type ApiRole = 'ALUMNO' | 'ENTRENADOR' | 'ADMINISTRADOR';

/** Error HTTP del backend, con el código `error` que devuelve en el cuerpo. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(`API ${status}: ${code}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
}

function devUserIdFor(role: ApiRole): string | undefined {
  const env = import.meta.env;
  switch (role) {
    case 'ALUMNO':
      return env.VITE_DEV_STUDENT_ID;
    case 'ENTRENADOR':
      return env.VITE_DEV_TRAINER_ID;
    case 'ADMINISTRADOR':
      return env.VITE_DEV_ADMIN_ID;
  }
}

/**
 * El backend todavía no tiene login: `auth.middleware` resuelve el usuario
 * desde `x-user-id`, `x-user-roles` y `x-gym-id`. Se manda una identidad por
 * rol porque `requireStudentOwnership` rechaza con 403 a un ALUMNO que consulta
 * a otro alumno. Sin variables `VITE_DEV_*` no se envía ningún header.
 */
function devIdentityHeaders(role: ApiRole): Record<string, string> {
  const userId = devUserIdFor(role);
  if (!userId) {
    return {};
  }

  const headers: Record<string, string> = {
    'x-user-id': userId,
    'x-user-roles': role,
  };
  if (import.meta.env.VITE_DEV_GYM_ID) {
    headers['x-gym-id'] = import.meta.env.VITE_DEV_GYM_ID;
  }
  return headers;
}

function errorCode(body: unknown): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
  ) {
    return body.error;
  }
  return 'unknown_error';
}

export interface ApiRequestOptions {
  /** Rol con el que se hace la consulta. */
  as: ApiRole;
  signal?: AbortSignal;
}

/**
 * Transporte común hacia el backend. Devuelve el JSON sin tipar: cada contrato
 * lo valida con su schema hasta que exista el cliente generado desde OpenAPI.
 */
export async function apiGet(
  path: string,
  { as, signal }: ApiRequestOptions,
): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', ...devIdentityHeaders(as) },
    signal,
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, errorCode(body));
  }

  return body;
}
