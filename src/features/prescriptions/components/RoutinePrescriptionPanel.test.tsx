import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  mockApi,
  renderRoute,
  type MockResponse,
} from '../../../../test/apiMocks';
import { RoutinePrescriptionPanel } from './RoutinePrescriptionPanel';

const catalogFixtures = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock('../../../api/catalog', async () => {
  const actual = await vi.importActual<typeof import('../../../api/catalog')>(
    '../../../api/catalog',
  );
  return { ...actual, listCatalog: catalogFixtures.search };
});

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
  reviewToken: 'a'.repeat(64),
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

function render(
  routes: Record<
    string,
    MockResponse | ((init?: RequestInit) => MockResponse)
  > = {},
) {
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

const EJERCICIO_MANUAL = {
  id: 'e0000000-0003-4000-8000-000000000003',
  name: 'Sentadilla con barra',
  description: null,
  instructions: 'Bajá con la espalda neutra.',
  tips: [],
  movementPattern: 'DOMINANTE_RODILLA',
  difficultyLevel: 'INTERMEDIO',
  unilateral: false,
  origin: 'CATALOGO_BASE',
  state: 'APROBADO',
  source: 'RepDB',
  authorUserId: null,
  revision: 1,
  enabled: true,
  availabilityRevision: 1,
  availabilityUpdatedAt: null,
  updatedAt: '2026-10-01T00:00:00.000Z',
  equipment: ['BARRA'],
  primaryMuscles: ['CUADRICEPS'],
  secondaryMuscles: ['GLUTEO'],
  joints: ['RODILLA'],
  media: [],
};

describe('RoutinePrescriptionPanel (RF-022, RF-110)', () => {
  beforeEach(() => {
    catalogFixtures.search.mockResolvedValue({
      items: [EJERCICIO_MANUAL],
      total: 1,
      page: 1,
      pageSize: 8,
    });
  });

  afterEach(() => {
    localStorage.clear();
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

    fireEvent.change(
      await screen.findByLabelText('Observación para el alumno'),
      { target: { value: 'Arranca con esta' } },
    );
    const aprobar = screen.getByRole('button', {
      name: 'Aprobar y poner en vigencia',
    });
    await waitFor(() => expect(aprobar).toBeEnabled());
    fireEvent.click(aprobar);

    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find(
        ([url, init]) =>
          init?.method === 'POST' && String(url).endsWith('/review'),
      );
      expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({
        result: 'APROBADA',
        observation: 'Arranca con esta',
        reviewToken: 'a'.repeat(64),
      });
    });
  });

  it('HU17: rechazar sin motivo no llama al backend y lo pide en el campo', async () => {
    const fetchMock = render({
      [`GET /students/${STUDENT}/routines`]: { body: [rutina('PROPUESTA')] },
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: { body: CONTENIDO },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));

    expect(
      screen.getByText('Para rechazar la rutina indicá el motivo.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Observación para el alumno')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).endsWith('/review')),
    ).toBe(false);
  });

  it('RN-40: si el backend pide confirmar el objetivo, exige marcarla antes de aprobar', async () => {
    let intentos = 0;
    const fetchMock = render({
      [`GET /students/${STUDENT}/routines`]: { body: [rutina('PROPUESTA')] },
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: { body: CONTENIDO },
      [`POST /students/${STUDENT}/routines/${ROUTINE}/review`]: () => {
        intentos += 1;
        return intentos === 1
          ? {
              status: 409,
              body: { error: 'goal_mismatch_confirmation_required' },
            }
          : {
              body: {
                routineId: ROUTINE,
                state: 'VIGENTE',
                archivedRoutineId: null,
              },
            };
      },
    });

    const aprobar = await screen.findByRole('button', {
      name: 'Aprobar y poner en vigencia',
    });
    await waitFor(() => expect(aprobar).toBeEnabled());
    fireEvent.click(aprobar);

    const confirmacion = await screen.findByLabelText(
      'Lo revisé y quiero aprobarla igual.',
    );
    expect(
      screen.getByRole('button', { name: 'Aprobar y poner en vigencia' }),
    ).toBeDisabled();
    fireEvent.click(confirmacion);
    fireEvent.click(
      screen.getByRole('button', { name: 'Aprobar y poner en vigencia' }),
    );

    await waitFor(() => {
      const llamadas = fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/review'),
      );
      expect(JSON.parse(String(llamadas[1]?.[1]?.body))).toEqual({
        result: 'APROBADA',
        confirmGoalMismatch: true,
        reviewToken: 'a'.repeat(64),
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

  it('ofrece generar con IA para el alumno desde la ficha', async () => {
    render();

    expect(
      await screen.findByRole('button', { name: 'Generar nueva rutina' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Indicaciones')).toBeInTheDocument();
  });

  it('crea una rutina manual como propuesta sin plantilla', async () => {
    const fetchMock = render({
      [`POST /students/${STUDENT}/routines/manual`]: {
        status: 201,
        body: {
          routineId: 'rutina-manual',
          versionId: 'version-1',
          state: 'PROPUESTA',
        },
      },
    });

    fireEvent.change(screen.getByLabelText('Nombre del día 1'), {
      target: { value: 'Día A' },
    });
    fireEvent.change(
      screen.getByPlaceholderText(/Buscar ejercicio habilitado/),
      { target: { value: 'sentadilla' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Agregar Sentadilla con barra',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Crear rutina manual' }),
    );

    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find(
        ([url, init]) =>
          init?.method === 'POST' && String(url).endsWith('/routines/manual'),
      );
      expect(JSON.parse(String(llamada?.[1]?.body))).toMatchObject({
        routineType: 'HIPERTROFIA',
        days: [
          {
            name: 'Día A',
            exercises: [
              {
                exerciseId: EJERCICIO_MANUAL.id,
                sets: [{ maxRepetitions: 12 }],
              },
            ],
          },
        ],
      });
    });
    expect(await screen.findByText('Rutina manual creada')).toBeInTheDocument();
  });

  it('oculta generación y manual cuando hay una propuesta abierta', async () => {
    render({
      [`GET /students/${STUDENT}/routines`]: { body: [rutina('PROPUESTA')] },
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: { body: CONTENIDO },
    });

    expect(
      await screen.findByText('Propuesta sin resolver'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Generar nueva rutina' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Crear rutina manual' }),
    ).not.toBeInTheDocument();
  });
});
