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

  it('usa VITE_API_URL y envía la identidad de desarrollo del rol pedido', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test/');
    vi.stubEnv('VITE_DEV_STUDENT_ID', 'alumno-1');
    vi.stubEnv('VITE_DEV_TRAINER_ID', 'entrenador-1');
    vi.stubEnv('VITE_DEV_GYM_ID', 'gym-1');
    const fetchMock = mockFetch(200, { ok: true });

    await expect(
      apiGet('/students/alumno-1/routines/active', { as: 'ENTRENADOR' }),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://api.test/students/alumno-1/routines/active',
    );
    expect(requestInit(fetchMock)).toMatchObject({
      credentials: 'include',
      headers: {
        'x-user-id': 'entrenador-1',
        'x-user-roles': 'ENTRENADOR',
        'x-gym-id': 'gym-1',
      },
    });
  });

  it('no envía headers de identidad si el rol no tiene usuario configurado', async () => {
    vi.stubEnv('VITE_DEV_STUDENT_ID', '');
    const fetchMock = mockFetch(200, {});

    await apiGet('/routines/active', { as: 'ALUMNO' });

    expect(requestInit(fetchMock).headers).not.toHaveProperty('x-user-id');
  });

  it('convierte una respuesta de error en ApiError con el código del backend', async () => {
    mockFetch(404, { error: 'active_routine_not_found' });

    const error = await apiGet('/routines/active', { as: 'ALUMNO' }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      code: 'active_routine_not_found',
    });
  });
});
