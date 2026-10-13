import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  mockApi,
  renderRoute,
  type MockResponse,
} from '../../../../test/apiMocks';
import { TemplatesPage } from './TemplatesPage';

const fixtures = vi.hoisted(() => ({ searchExercises: vi.fn() }));
vi.mock('../../../api/catalog', async () => {
  const actual = await vi.importActual<typeof import('../../../api/catalog')>(
    '../../../api/catalog',
  );
  return { ...actual, listCatalog: fixtures.searchExercises };
});

const TEMPLATE = '40000000-0000-4000-8000-000000000001';
const EXERCISE = 'e0000000-0003-4000-8000-000000000003';

const LISTA = [
  {
    id: TEMPLATE,
    name: 'Fuerza 4 días',
    routineType: 'FUERZA',
    dayCount: 4,
    exerciseCount: 4,
  },
];

const DETALLE = {
  id: TEMPLATE,
  gymId: '10000000-0000-4000-8000-000000000001',
  authorTrainerId: '21000000-0000-4000-8000-000000000002',
  name: 'Fuerza 4 días',
  routineType: 'FUERZA',
  active: true,
  days: [
    {
      position: 1,
      name: 'Superior A',
      exercises: [
        {
          position: 1,
          exerciseId: EXERCISE,
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

const EJERCICIO = {
  id: EXERCISE,
  name: 'Press de banca plano',
  description: null,
  instructions: 'Acostate y empujá la barra.',
  tips: [],
  movementPattern: 'EMPUJE_HORIZONTAL',
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
  primaryMuscles: ['PECTORAL'],
  secondaryMuscles: ['TRICEPS'],
  joints: ['HOMBRO'],
  media: [],
};

function render(routes: Record<string, MockResponse> = {}) {
  const fetchMock = mockApi({
    'GET /routine-templates': { body: LISTA },
    ...routes,
  });
  renderRoute(
    '/entrenador/plantillas',
    '/entrenador/plantillas',
    <TemplatesPage />,
  );
  return fetchMock;
}

function llamada(
  fetchMock: ReturnType<typeof mockApi>,
  method: string,
  path: string,
) {
  return fetchMock.mock.calls.find(
    ([input, init]) =>
      (init?.method ?? 'GET') === method &&
      new URL(input as string).pathname === path,
  );
}

describe('TemplatesPage (RF-019, RF-020)', () => {
  beforeEach(() => {
    fixtures.searchExercises.mockResolvedValue({
      items: [EJERCICIO],
      total: 1,
      page: 1,
      pageSize: 8,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('lista las plantillas del gimnasio con su composición', async () => {
    render();

    expect(await screen.findByText('Fuerza 4 días')).toBeInTheDocument();
    expect(
      await screen.findByText('FUERZA · 4 días · 4 ejercicios'),
    ).toBeInTheDocument();
  });

  it('muestra un estado vacío que invita a crear la primera', async () => {
    render({ 'GET /routine-templates': { body: [] } });

    expect(
      await screen.findByText(/Todavía no hay plantillas/),
    ).toBeInTheDocument();
  });

  it('crea una plantilla buscando y agregando un ejercicio habilitado', async () => {
    const fetchMock = render({
      'POST /routine-templates': {
        status: 201,
        body: { templateId: TEMPLATE },
      },
    });

    fireEvent.click(
      await screen.findByRole('button', { name: 'Nueva plantilla' }),
    );

    fireEvent.change(screen.getByLabelText('Nombre de la plantilla'), {
      target: { value: 'Hipertrofia 3 días' },
    });
    fireEvent.change(screen.getByLabelText('Nombre del día 1'), {
      target: { value: 'Día A - Empuje' },
    });
    fireEvent.change(
      screen.getByPlaceholderText(/Buscar ejercicio habilitado/),
      { target: { value: 'press banca' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Agregar Press de banca plano',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Crear plantilla' }));

    await waitFor(() => {
      expect(llamada(fetchMock, 'POST', '/routine-templates')).toBeDefined();
    });
    const [, init] = llamada(fetchMock, 'POST', '/routine-templates')!;
    expect(JSON.parse(init?.body as string)).toMatchObject({
      name: 'Hipertrofia 3 días',
      routineType: 'HIPERTROFIA',
      days: [
        {
          name: 'Día A - Empuje',
          exercises: [
            {
              exerciseId: EXERCISE,
              sets: [
                {
                  minRepetitions: 8,
                  maxRepetitions: 12,
                  suggestedLoad: null,
                  restSeconds: 60,
                  warmup: false,
                },
              ],
            },
          ],
        },
      ],
    });
    expect(await screen.findByText('Plantilla creada.')).toBeInTheDocument();
  });

  it('no envía nada cuando falta el contenido mínimo', async () => {
    const fetchMock = render();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Nueva plantilla' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Crear plantilla' }),
    );

    expect(
      await screen.findByText(/La plantilla necesita un nombre\./),
    ).toBeInTheDocument();
    expect(llamada(fetchMock, 'POST', '/routine-templates')).toBeUndefined();
  });

  it('edita una plantilla existente con PUT', async () => {
    const fetchMock = render({
      [`GET /routine-templates/${TEMPLATE}`]: { body: DETALLE },
      [`PUT /routine-templates/${TEMPLATE}`]: {
        body: { templateId: TEMPLATE },
      },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    const nombre = await screen.findByLabelText('Nombre de la plantilla');
    expect((nombre as HTMLInputElement).value).toBe('Fuerza 4 días');
    expect(await screen.findByText('Press de banca plano')).toBeInTheDocument();

    fireEvent.change(nombre, { target: { value: 'Fuerza 4 días v2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(
        llamada(fetchMock, 'PUT', `/routine-templates/${TEMPLATE}`),
      ).toBeDefined();
    });
    expect(
      await screen.findByText('Plantilla actualizada.'),
    ).toBeInTheDocument();
  });

  it('desactiva una plantilla con DELETE sin sacarla del historial', async () => {
    const fetchMock = render({
      [`DELETE /routine-templates/${TEMPLATE}`]: {
        body: { templateId: TEMPLATE, active: false },
      },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar' }));

    await waitFor(() => {
      expect(
        llamada(fetchMock, 'DELETE', `/routine-templates/${TEMPLATE}`),
      ).toBeDefined();
    });
    expect(
      await screen.findByText('Plantilla desactivada.'),
    ).toBeInTheDocument();
  });
});
