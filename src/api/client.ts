const DEFAULT_API_URL = 'http://localhost:3000';

/** Roles que reconoce el backend (`UserRole` en `shared/types/auth.ts`). */
export type ApiRole = 'ALUMNO' | 'ENTRENADOR' | 'ADMINISTRADOR';

/** Error HTTP del backend, con el código `error` y el cuerpo que devolvió. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: unknown;

  constructor(status: number, code: string, body: unknown = null) {
    super(`API ${status}: ${code}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError ||
    (typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      'code' in error)
  );
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
  /** Rol con el que se hace la consulta (opcional para endpoints públicos). */
  as?: ApiRole;
  signal?: AbortSignal;
}

async function apiRequest(
  method: 'GET' | 'POST',
  path: string,
  options?: ApiRequestOptions,
  body?: unknown,
): Promise<unknown> {
  const { as, signal } = options ?? {};
  const hasBody = body !== undefined;
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('auth_token')
      : null;
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(as ? devIdentityHeaders(as) : {}),
      ...authHeaders,
    },
    body: hasBody ? JSON.stringify(body) : undefined,
    signal,
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, errorCode(data), data);
  }

  return data;
}

/**
 * Transporte común hacia el backend. Devuelve el JSON sin tipar: cada contrato
 * lo valida con su schema hasta que exista el cliente generado desde OpenAPI.
 */
export function apiGet(
  path: string,
  options?: ApiRequestOptions,
): Promise<unknown> {
  return apiRequest('GET', path, options);
}

export function apiPost(
  path: string,
  body: unknown,
  options?: ApiRequestOptions,
): Promise<unknown> {
  return apiRequest('POST', path, options, body);
}
