import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiGet } from './client';

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function requestInit(fetchMock: ReturnType<typeof mockFetch>): RequestInit {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return init;
}

describe('apiGet', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('usa VITE_API_URL e incluye la cookie de sesión', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test/');
    const fetchMock = mockFetch(200, { ok: true });

    await expect(apiGet('/routines/active')).resolves.toEqual({ ok: true });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://api.test/routines/active',
    );
    expect(requestInit(fetchMock)).toMatchObject({
      credentials: 'include',
    });
  });

  it('no envía headers que permitan simular una identidad', async () => {
    const fetchMock = mockFetch(200, {});

    await apiGet('/routines/active');

    expect(requestInit(fetchMock).headers).not.toHaveProperty('x-user-id');
    expect(requestInit(fetchMock).headers).not.toHaveProperty('x-user-roles');
    expect(requestInit(fetchMock).headers).not.toHaveProperty('x-gym-id');
  });

  it('convierte una respuesta de error en ApiError con el código del backend', async () => {
    mockFetch(404, { error: 'active_routine_not_found' });

    const error = await apiGet('/routines/active').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      code: 'active_routine_not_found',
    });
  });
});
