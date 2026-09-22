import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '../../test/apiMocks';
import {
  fetchRoutineGeneration,
  requestRoutineGeneration,
} from './routineGenerations';

const STUDENT_ID = '20000000-0000-4000-8000-000000000005';
const REQUEST_ID = '50000000-0000-4000-8000-000000000001';

describe('routine generations API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envía una solicitud idempotente y normaliza el estado del gateway', async () => {
    const fetchMock = mockApi({
      [`POST /students/${STUDENT_ID}/routine-generations`]: {
        status: 202,
        body: { requestId: REQUEST_ID, status: 'pending' },
      },
    });

    await expect(
      requestRoutineGeneration(STUDENT_ID, {
        textoLibre: 'Priorizar fuerza',
        idempotencyKey: 'request-key',
      }),
    ).resolves.toEqual({ requestId: REQUEST_ID, status: 'PENDIENTE' });

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      textoLibre: 'Priorizar fuerza',
      idempotencyKey: 'request-key',
    });
  });

  it('valida el snapshot que devuelve el polling', async () => {
    mockApi({
      [`GET /students/${STUDENT_ID}/routine-generations/${REQUEST_ID}`]: {
        body: {
          requestId: REQUEST_ID,
          status: 'COMPLETADA',
          estructuraCandidata: { dias: [] },
          violaciones: [],
          error: null,
        },
      },
    });

    await expect(
      fetchRoutineGeneration(STUDENT_ID, REQUEST_ID),
    ).resolves.toMatchObject({
      requestId: REQUEST_ID,
      status: 'COMPLETADA',
      estructuraCandidata: { dias: [] },
    });
  });
});
