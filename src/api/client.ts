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
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
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

export function apiPut(
  path: string,
  body: unknown,
  options: ApiRequestOptions = {},
): Promise<unknown> {
  return apiRequest('PUT', path, options, body);
}

export function apiDelete(
  path: string,
  options: ApiRequestOptions = {},
): Promise<unknown> {
  return apiRequest('DELETE', path, options);
}

export function apiPatch(
  path: string,
  body: unknown,
  options: ApiRequestOptions = {},
): Promise<unknown> {
  return apiRequest('PATCH', path, options, body);
}

/** Errores por campo que devuelve el backend (`fields`), si vinieron. */
export function fieldErrors(error: unknown): Record<string, string[]> {
  if (
    error instanceof ApiError &&
    typeof error.body === 'object' &&
    error.body !== null &&
    'fields' in error.body &&
    typeof error.body.fields === 'object' &&
    error.body.fields !== null
  ) {
    return error.body.fields as Record<string, string[]>;
  }
  return {};
}

/**
 * Detalle de validación Zod que devuelve el backend (`details` con
 * `fieldErrors` y `formErrors`). Lo que antes se mostraba como un seco
 * `invalid_request_body` ahora nombra el campo y el rango esperado.
 */
export function validationMessages(error: unknown): string[] {
  if (!(error instanceof ApiError)) return [];
  if (typeof error.body !== 'object' || error.body === null) return [];
  if (!('details' in error.body)) return [];
  const details = (error.body as { details?: unknown }).details;
  if (typeof details !== 'object' || details === null) return [];
  const { fieldErrors: fields, formErrors } = details as {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };
  const messages = [...(formErrors ?? [])];
  for (const [field, errors] of Object.entries(fields ?? {})) {
    for (const message of errors) {
      messages.push(`${field}: ${message}`);
    }
  }
  return messages;
}

/** Mensaje legible del backend, si lo trae. */
export function apiMessage(error: unknown): string | null {
  if (
    error instanceof ApiError &&
    typeof error.body === 'object' &&
    error.body !== null &&
    'message' in error.body &&
    typeof error.body.message === 'string'
  ) {
    return error.body.message;
  }
  return null;
}
