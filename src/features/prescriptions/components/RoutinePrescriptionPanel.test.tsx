import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  mockApi,
  renderRoute,
  type MockResponse,
} from '../../../../test/apiMocks';
import { RoutinePrescriptionPanel } from './RoutinePrescriptionPanel';

const STUDENT = '21000000-0000-4000-8000-000000000004';
const ROUTINE = 'd76887cb-c813-4580-9a62-20ba084d26d1';

const PLANTILLAS = [
  {
    id: '40000000-0000-4000-8000-000000000002',
    name: 'Fuerza 4 dias superior/inferior',
    routineType: 'FUERZA',
    dayCount: 4,
    exerciseCount: 4,
  },
  {
    id: '40000000-0000-4000-8000-000000000001',
    name: 'Hipertrofia 3 dias (principiantes)',
    routineType: 'HIPERTROFIA',
    dayCount: 3,
    exerciseCount: 6,
  },
];

function rutina(state: string) {
  return {
    id: ROUTINE,
    studentId: STUDENT,
    routineType: 'FUERZA',
    state,
    origin: 'PLANTILLA_ENTRENADOR',
    targetWeeklyFrequency: 4,
    requestedAt: '2026-09-21T10:00:00.000Z',
    versionId: 'version-1',
    versionNumber: 1,
  };
}

const CONTENIDO = {
  ...rutina('PROPUESTA'),
  days: [
    {
      position: 1,
      name: 'Superior A',
      dominantPattern: 'EMPUJE_HORIZONTAL',
      exercises: [
        {
          position: 1,
          exerciseId: 'ej-1',
          exerciseName: 'Press de banca plano',
          movementPattern: 'EMPUJE_HORIZONTAL',
          note: null,
          sets: [
            {
              position: 1,
              minRepetitions: 8,
              maxRepetitions: 10,
              suggestedLoad: 40,
              restSeconds: 90,
              warmup: false,
            },
          ],
        },
      ],
    },
  ],
};

/**
 * El botón de asignar nace deshabilitado hasta que llegan las plantillas, así que
 * los tests que asignan tienen que esperar a que el select esté poblado.
 */
async function botonAsignarHabilitado() {
  await screen.findByRole('option', {
    name: /Fuerza 4 dias superior\/inferior/,
  });
  const boton = screen.getByRole('button', { name: 'Asignar como propuesta' });
  await waitFor(() => {
    expect(boton).toBeEnabled();
  });
  return boton;
}

function render(routes: Record<string, MockResponse> = {}) {
  const fetchMock = mockApi({
    'GET /routine-templates': { body: PLANTILLAS },
    [`GET /students/${STUDENT}/routines`]: { body: [] },
    ...routes,
  });

  renderRoute(
    '/entrenador/alumnos/:studentId',
    `/entrenador/alumnos/${STUDENT}`,
    <RoutinePrescriptionPanel studentId={STUDENT} />,
  );

  return fetchMock;
}

describe('RoutinePrescriptionPanel (RF-022, RF-110)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sin rutina vigente lo dice y ofrece las plantillas', async () => {
    render();

    expect(
      await screen.findByText('El alumno todavía no tiene una rutina vigente.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('option', {
        name: /Fuerza 4 dias superior\/inferior/,
      }),
    ).toBeInTheDocument();
  });

  it('asigna la plantilla elegida y la rutina nace como propuesta', async () => {
    const fetchMock = render({
      [`POST /students/${STUDENT}/routines`]: {
        status: 201,
        body: {
          routineId: ROUTINE,
          versionId: 'version-1',
          state: 'PROPUESTA',
        },
      },
    });

    fireEvent.click(await botonAsignarHabilitado());

    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find(
        ([, init]) => init?.method === 'POST',
      );
      expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({
        templateId: '40000000-0000-4000-8000-000000000002',
      });
    });
  });

  it('con una propuesta abierta muestra su contenido y los dos botones', async () => {
    render({
      [`GET /students/${STUDENT}/routines`]: { body: [rutina('PROPUESTA')] },
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: { body: CONTENIDO },
    });

    expect(
      await screen.findByText('Propuesta sin resolver'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Día 1 · Superior A')).toBeInTheDocument();
    expect(screen.getByText('1. Press de banca plano')).toBeInTheDocument();
    expect(
      screen.getByText(/8-10 rep · 40 kg · 90s de descanso/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Aprobar y poner en vigencia' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Rechazar' }),
    ).toBeInTheDocument();
    // Con una propuesta abierta no se ofrece asignar otra.
    expect(
      screen.queryByRole('button', { name: 'Asignar como propuesta' }),
    ).not.toBeInTheDocument();
  });

  it('aprueba la propuesta enviando el resultado y la observación', async () => {
    const fetchMock = render({
      [`GET /students/${STUDENT}/routines`]: { body: [rutina('PROPUESTA')] },
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: { body: CONTENIDO },
      [`POST /students/${STUDENT}/routines/${ROUTINE}/review`]: {
        body: { routineId: ROUTINE, state: 'VIGENTE', archivedRoutineId: null },
      },
    });

    fireEvent.change(await screen.findByLabelText('Observación (opcional)'), {
      target: { value: 'Arranca con esta' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Aprobar y poner en vigencia' }),
    );

    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find(
        ([url, init]) =>
          init?.method === 'POST' && String(url).endsWith('/review'),
      );
      expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({
        result: 'APROBADA',
        observation: 'Arranca con esta',
      });
    });
  });

  it('explica el rechazo del backend cuando ya hay una propuesta', async () => {
    render({
      [`POST /students/${STUDENT}/routines`]: {
        status: 409,
        body: { error: 'pending_proposal' },
      },
    });

    fireEvent.click(await botonAsignarHabilitado());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya hay una rutina propuesta sin resolver',
    );
  });

  it('con rutina vigente informa su tipo y frecuencia', async () => {
    render({
      [`GET /students/${STUDENT}/routines`]: { body: [rutina('VIGENTE')] },
    });

    expect(
      await screen.findByText('Rutina vigente: fuerza · 4 días por semana.'),
    ).toBeInTheDocument();
  });
});
