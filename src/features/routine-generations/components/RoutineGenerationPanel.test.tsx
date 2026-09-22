import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { RoutineGenerationPanel } from './RoutineGenerationPanel';

const STUDENT_ID = '20000000-0000-4000-8000-000000000005';
const REQUEST_ID = '50000000-0000-4000-8000-000000000001';
const ROUTINE_ID = '60000000-0000-4000-8000-000000000001';
const STORAGE_KEY = `gym:routine-generation:${STUDENT_ID}`;

function renderPanel() {
  return renderRoute(
    '/entrenador/alumnos/:studentId',
    `/entrenador/alumnos/${STUDENT_ID}`,
    <RoutineGenerationPanel studentId={STUDENT_ID} />,
  );
}

describe('RoutineGenerationPanel', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('crea la solicitud, conserva su identificador y consulta hasta completar', async () => {
    const fetchMock = mockApi({
      [`POST /students/${STUDENT_ID}/routine-generations`]: {
        status: 202,
        body: { requestId: REQUEST_ID, status: 'pending' },
      },
      [`GET /students/${STUDENT_ID}/routine-generations/${REQUEST_ID}`]: {
        body: {
          requestId: REQUEST_ID,
          status: 'COMPLETADA',
          estructuraCandidata: { dias: [] },
          violaciones: null,
          error: null,
        },
      },
      [`POST /students/${STUDENT_ID}/routine-generations/${REQUEST_ID}/finalize`]:
        {
          status: 201,
          body: { routineId: ROUTINE_ID, status: 'PROPUESTA' },
        },
    });

    renderPanel();
    fireEvent.change(screen.getByLabelText('Indicaciones'), {
      target: { value: 'Priorizar fuerza y sesiones cortas' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Generar nueva rutina' }),
    );

    expect(await screen.findByText('Generación completada')).toBeVisible();
    expect(
      await screen.findByText(
        'La rutina propuesta quedó creada y está lista para revisión.',
      ),
    ).toBeVisible();

    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
      textoLibre: 'Priorizar fuerza y sesiones cortas',
      idempotencyKey: expect.any(String),
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject(
      {
        requestId: REQUEST_ID,
        idempotencyKey: expect.any(String),
      },
    );
  });

  it('recupera una generación activa después de recargar', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ idempotencyKey: 'stable-key', requestId: REQUEST_ID }),
    );
    const fetchMock = mockApi({
      [`GET /students/${STUDENT_ID}/routine-generations/${REQUEST_ID}`]: {
        body: {
          requestId: REQUEST_ID,
          status: 'PROCESANDO',
          estructuraCandidata: null,
          violaciones: null,
          error: null,
        },
      },
    });

    renderPanel();

    expect(await screen.findByText('Generando rutina')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `/students/${STUDENT_ID}/routine-generations/${REQUEST_ID}`,
      ),
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('mantiene la ficha disponible cuando IA no está disponible', async () => {
    mockApi({
      [`POST /students/${STUDENT_ID}/routine-generations`]: {
        status: 503,
        body: { error: 'ai_service_unavailable' },
      },
    });

    renderPanel();
    fireEvent.change(screen.getByLabelText('Indicaciones'), {
      target: { value: 'Crear una rutina de fuerza' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Generar nueva rutina' }),
    );

    expect(
      await screen.findByText(/temporalmente no disponible/),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Generar nueva rutina' }),
      ).toBeEnabled(),
    );
  });
});
