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
    '/alumno',
    '/alumno',
    <RoutineGenerationPanel studentId={STUDENT_ID} />,
  );
}

describe('RoutineGenerationPanel', () => {
  it('muestra el motivo concreto cuando el catálogo no permite cumplir el prompt', async () => {
    mockApi({
      [`POST /students/${STUDENT_ID}/routine-generations`]: {
        status: 422,
        body: {
          error: 'generation_preferences_unsatisfiable',
          violations: [
            'Pediste 3 ejercicios distintos de TRICEPS por día y hay 0 compatibles en el catálogo.',
          ],
        },
      },
    });
    renderPanel();
    fireEvent.change(screen.getByLabelText('Indicaciones'), {
      target: { value: '3 ejercicios de tríceps por día' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Generar nueva rutina' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'hay 0 compatibles',
    );
  });
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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
    expect(screen.getByRole('link', { name: 'Ver rutina' })).toHaveAttribute(
      'href',
      '/alumno/rutina',
    );

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

  it('reutiliza la clave solo con las mismas indicaciones', async () => {
    let postCount = 0;
    const fetchMock = mockApi({
      [`POST /students/${STUDENT_ID}/routine-generations`]: () => {
        postCount += 1;
        if (postCount === 1) {
          return { status: 503, body: { error: 'ai_service_unavailable' } };
        }
        if (postCount === 2) {
          return { status: 422, body: { error: 'empty_prefiltered_catalog' } };
        }
        return {
          status: 202,
          body: { requestId: REQUEST_ID, status: 'PENDING' },
        };
      },
    });

    renderPanel();
    const instructions = screen.getByLabelText('Indicaciones');
    const submit = screen.getByRole('button', {
      name: 'Generar nueva rutina',
    });
    const postBodies = () =>
      fetchMock.mock.calls
        .filter(([, init]) => init?.method === 'POST')
        .map(([, init]) => JSON.parse(String(init?.body)));

    fireEvent.change(instructions, { target: { value: 'Priorizar fuerza' } });
    fireEvent.click(submit);
    expect(
      await screen.findByText(/temporalmente no disponible/),
    ).toBeVisible();
    await waitFor(() => expect(postBodies()).toHaveLength(1));
    const firstKey = postBodies()[0].idempotencyKey;

    fireEvent.click(submit);
    expect(
      await screen.findByText(
        'No hay ejercicios compatibles con el inventario del gimnasio.',
      ),
    ).toBeVisible();
    await waitFor(() => expect(postBodies()).toHaveLength(2));
    expect(postBodies()[1].idempotencyKey).toBe(firstKey);

    fireEvent.change(instructions, {
      target: { value: 'Priorizar movilidad' },
    });
    fireEvent.click(submit);
    await waitFor(() => expect(postBodies()).toHaveLength(3));
    expect(postBodies()[2].textoLibre).toBe('Priorizar movilidad');
    expect(postBodies()[2].idempotencyKey).not.toBe(firstKey);
  });

  it('recupera automáticamente una clave antigua en conflicto', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ idempotencyKey: 'legacy-key' }),
    );
    let postCount = 0;
    const fetchMock = mockApi({
      [`POST /students/${STUDENT_ID}/routine-generations`]: () => {
        postCount += 1;
        return postCount === 1
          ? {
              status: 409,
              body: { error: 'routine_generation_idempotency_conflict' },
            }
          : {
              status: 202,
              body: { requestId: REQUEST_ID, status: 'PENDING' },
            };
      },
    });

    renderPanel();
    fireEvent.change(screen.getByLabelText('Indicaciones'), {
      target: { value: 'Crear una rutina de fuerza' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Generar nueva rutina' }),
    );

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST'),
      ).toHaveLength(2),
    );
    const postBodies = fetchMock.mock.calls
      .filter(([, init]) => init?.method === 'POST')
      .map(([, init]) => JSON.parse(String(init?.body)));
    expect(postBodies[0].idempotencyKey).toBe('legacy-key');
    expect(postBodies[1].textoLibre).toBe('Crear una rutina de fuerza');
    expect(postBodies[1].idempotencyKey).not.toBe('legacy-key');
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

  it('ofrece abrir la propuesta existente si hay una revisión pendiente', async () => {
    mockApi({
      [`POST /students/${STUDENT_ID}/routine-generations`]: {
        status: 409,
        body: { error: 'proposed_routine_already_exists' },
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
      await screen.findByRole('link', {
        name: 'Ver rutina pendiente de revisión',
      }),
    ).toHaveAttribute('href', '/alumno/rutina');
  });

  it('recupera el enlace a una rutina ya finalizada al recargar', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ idempotencyKey: 'stable-key', requestId: REQUEST_ID }),
    );
    const fetchMock = mockApi({
      [`GET /students/${STUDENT_ID}/routine-generations/${REQUEST_ID}`]: {
        body: {
          requestId: REQUEST_ID,
          status: 'COMPLETADA',
          routineId: ROUTINE_ID,
          estructuraCandidata: null,
          violaciones: null,
          error: null,
        },
      },
    });

    renderPanel();

    expect(
      await screen.findByRole('link', { name: 'Ver rutina' }),
    ).toHaveAttribute('href', '/alumno/rutina');
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST'),
    ).toHaveLength(0);
  });

  it('abre la propuesta existente cuando la finalización encuentra otra rutina pendiente', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ idempotencyKey: 'old-request', requestId: REQUEST_ID }),
    );
    const fetchMock = mockApi({
      [`GET /students/${STUDENT_ID}/routine-generations/${REQUEST_ID}`]: {
        body: {
          requestId: REQUEST_ID,
          status: 'COMPLETADA',
          routineId: null,
          estructuraCandidata: null,
          violaciones: null,
          error: null,
        },
      },
      [`POST /students/${STUDENT_ID}/routine-generations/${REQUEST_ID}/finalize`]:
        {
          status: 409,
          body: { error: 'proposed_routine_already_exists' },
        },
    });

    renderPanel();

    expect(
      await screen.findByRole('link', {
        name: 'Ver rutina pendiente de revisión',
      }),
    ).toHaveAttribute('href', '/alumno/rutina');
    expect(screen.getByText('Rutina pendiente de revisión')).toBeVisible();
    expect(
      screen.getByText('Ya tenés una rutina propuesta pendiente de revisión.'),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Nueva solicitud' }),
    ).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject(
      {
        requestId: REQUEST_ID,
      },
    );
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST'),
    ).toHaveLength(1);
  });

  it('permite regenerar con otro prompt y una clave nueva para pruebas locales', async () => {
    const newRequestId = '50000000-0000-4000-8000-000000000002';
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ idempotencyKey: 'old-key', requestId: REQUEST_ID }),
    );
    const fetchMock = mockApi({
      [`GET /students/${STUDENT_ID}/routine-generations/${REQUEST_ID}`]: {
        body: {
          requestId: REQUEST_ID,
          status: 'COMPLETADA',
          routineId: ROUTINE_ID,
          estructuraCandidata: null,
          violaciones: null,
          error: null,
        },
      },
      [`POST /students/${STUDENT_ID}/routine-generations`]: {
        status: 202,
        body: { requestId: newRequestId, status: 'PENDIENTE' },
      },
      [`GET /students/${STUDENT_ID}/routine-generations/${newRequestId}`]: {
        body: {
          requestId: newRequestId,
          status: 'PROCESANDO',
          estructuraCandidata: null,
          violaciones: null,
          error: null,
        },
      },
    });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Regenerar' }));
    expect(screen.getByText('Prueba de regeneración')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Indicaciones'), {
      target: { value: 'Ahora priorizar hipertrofia en tres días' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generar de nuevo' }));
    expect(await screen.findByText('Generando rutina')).toBeVisible();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    const sent = JSON.parse(String(post?.[1]?.body));
    expect(sent).toMatchObject({
      textoLibre: 'Ahora priorizar hipertrofia en tres días',
      regenerar: true,
    });
    expect(sent.idempotencyKey).not.toBe('old-key');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject(
      { requestId: newRequestId, regenerate: true },
    );
    expect(
      screen.queryByRole('button', { name: 'Regenerar' }),
    ).not.toBeInTheDocument();
  });

  it('no muestra el botón de pruebas fuera de desarrollo', () => {
    vi.stubEnv('DEV', false);
    mockApi({});
    renderPanel();
    expect(
      screen.queryByRole('button', { name: 'Regenerar' }),
    ).not.toBeInTheDocument();
  });

  it('espera la finalización antes de ofrecer otra solicitud', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ idempotencyKey: 'stable-key', requestId: REQUEST_ID }),
    );
    const fetchMock = mockApi({
      [`GET /students/${STUDENT_ID}/routine-generations/${REQUEST_ID}`]: {
        body: {
          requestId: REQUEST_ID,
          status: 'COMPLETADA',
          routineId: null,
          estructuraCandidata: null,
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
    let finishFinalization: (() => void) | undefined;
    vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
      if (init?.method === 'POST' && input.endsWith('/finalize')) {
        await new Promise<void>((resolve) => {
          finishFinalization = resolve;
        });
      }
      return fetchMock(input, init);
    });

    renderPanel();

    expect(
      await screen.findByText(
        'El backend está validando el resultado y creando la rutina propuesta.',
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Nueva solicitud' }),
    ).not.toBeInTheDocument();
    finishFinalization?.();
    expect(
      await screen.findByRole('link', { name: 'Ver rutina' }),
    ).toBeVisible();
  });
});
