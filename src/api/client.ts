const DEFAULT_API_URL = 'http://localhost:3000';

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
  }
}

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
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
  signal?: AbortSignal;
}

async function apiRequest(
  method: 'GET' | 'POST',
  path: string,
  { signal }: ApiRequestOptions = {},
  body?: unknown,
): Promise<unknown> {
  const hasBody = body !== undefined;
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
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
  options: ApiRequestOptions = {},
): Promise<unknown> {
  return apiRequest('GET', path, options);
}

export function apiPost(
  path: string,
  body: unknown,
  options: ApiRequestOptions = {},
): Promise<unknown> {
  return apiRequest('POST', path, options, body);
}
