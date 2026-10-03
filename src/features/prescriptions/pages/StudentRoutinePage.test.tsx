import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '../../../../test/apiMocks';
import * as sessionHook from '../../auth/hooks/useSession';
import { RoutineGenerationPanel } from '../../routine-generations/components/RoutineGenerationPanel';
import { StudentRoutinePage } from './StudentRoutinePage';

const STUDENT = '21000000-0000-4000-8000-000000000004';
const ROUTINE = 'd76887cb-c813-4580-9a62-20ba084d26d1';

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
  ...rutina('VIGENTE'),
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
          note: 'Bajar controlado',
          sets: [
            {
              position: 1,
              minRepetitions: 8,
              maxRepetitions: 8,
              suggestedLoad: 0,
              restSeconds: 120,
              warmup: true,
            },
          ],
        },
      ],
    },
  ],
};

function renderPage(
  routes: Parameters<typeof mockApi>[0],
  showGenerationPanel = false,
) {
  vi.spyOn(sessionHook, 'useSession').mockReturnValue({
    user: { id: STUDENT, gymId: 'gym-1', roles: ['ALUMNO'] },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    adoptSession: vi.fn(),
  });
  const fetchMock = mockApi(routes);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/alumno/rutina']}>
        <StudentRoutinePage
          generationPanel={
            showGenerationPanel ? (
              <RoutineGenerationPanel studentId={STUDENT} />
            ) : undefined
          }
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetchMock;
}

describe('StudentRoutinePage (RF-026)', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('muestra los días, ejercicios y series de la rutina vigente', async () => {
    renderPage({
      [`GET /students/${STUDENT}/routines`]: { body: [rutina('VIGENTE')] },
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: { body: CONTENIDO },
    });

    expect(await screen.findByText('Día 1 · Superior A')).toBeInTheDocument();
    expect(screen.getByText('1. Press de banca plano')).toBeInTheDocument();
    // Peso corporal y entrada en calor se nombran, no se muestran como 0 kg.
    expect(
      screen.getByText(
        /Serie 1 \(entrada en calor\): 8 rep · peso corporal · 120s de descanso/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Nota: Bajar controlado')).toBeInTheDocument();
  });

  it('sin rutina vigente explica que todavía no hay nada', async () => {
    renderPage({
      [`GET /students/${STUDENT}/routines`]: { body: [] },
    });

    expect(
      await screen.findByText('No tenés una rutina vigente'),
    ).toBeInTheDocument();
  });

  it('conserva una carga sin definir en lugar de mostrar peso corporal', async () => {
    const content = CONTENIDO;
    const response = {
      ...content,
      days: content.days.map((day) => ({
        ...day,
        exercises: day.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set) => ({ ...set, suggestedLoad: null })),
        })),
      })),
    };
    renderPage({
      [`GET /students/${STUDENT}/routines`]: { body: [rutina('VIGENTE')] },
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: { body: response },
    });
    expect(
      await screen.findByText(/8 rep · carga a definir · 120s/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/peso corporal/)).not.toBeInTheDocument();
  });

  it('muestra el prompt persistido de la rutina generada', async () => {
    const prompt = 'Priorizar tren inferior\nTres días por semana';
    renderPage({
      [`GET /students/${STUDENT}/routines`]: {
        body: [{ ...rutina('PROPUESTA'), origin: 'GENERADA' }],
      },
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: {
        body: {
          ...CONTENIDO,
          state: 'PROPUESTA',
          origin: 'GENERADA',
          generationPrompt: prompt,
        },
      },
    });
    const region = await screen.findByRole('region', {
      name: 'Prompt solicitado',
    });
    expect(region.textContent).toContain(prompt);
  });

  it('muestra una propuesta con su contenido y el aviso de revisión pendiente', async () => {
    renderPage({
      [`GET /students/${STUDENT}/routines`]: { body: [rutina('PROPUESTA')] },
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: {
        body: { ...CONTENIDO, state: 'PROPUESTA' },
      },
    });

    expect(await screen.findByText('Día 1 · Superior A')).toBeInTheDocument();
    expect(screen.getByText('Pendiente de revisión')).toBeInTheDocument();
    expect(
      screen.getByText(/Tu entrenador debe revisar y aprobar esta rutina/),
    ).toBeInTheDocument();
    expect(screen.getByText('1. Press de banca plano')).toBeInTheDocument();
    expect(
      screen.getByText(/Serie 1 \(entrada en calor\)/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No tenés una rutina vigente'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /aprobar|iniciar|entrenar/i }),
    ).not.toBeInTheDocument();
  });

  it('muestra la propuesta y la vigente en secciones distintas', async () => {
    const proposedId = '60000000-0000-4000-8000-000000000001';
    renderPage({
      [`GET /students/${STUDENT}/routines`]: {
        body: [rutina('VIGENTE'), { ...rutina('PROPUESTA'), id: proposedId }],
      },
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: { body: CONTENIDO },
      [`GET /students/${STUDENT}/routines/${proposedId}`]: {
        body: {
          ...CONTENIDO,
          id: proposedId,
          state: 'PROPUESTA',
          days: [{ ...CONTENIDO.days[0], name: 'Superior propuesto' }],
        },
      },
    });

    expect(await screen.findByText('Día 1 · Superior A')).toBeVisible();
    expect(await screen.findByText('Día 1 · Superior propuesto')).toBeVisible();
    const pending = screen.getByRole('region', {
      name: 'Rutina pendiente de revisión',
    });
    const active = screen.getByRole('region', { name: 'Rutina vigente' });
    expect(within(pending).getByText('Pendiente de revisión')).toBeVisible();
    expect(
      within(active).queryByText('Pendiente de revisión'),
    ).not.toBeInTheDocument();
  });

  it('una propuesta bloqueada explica que falta asignar un entrenador', async () => {
    renderPage({
      [`GET /students/${STUDENT}/routines`]: { body: [rutina('BLOQUEADA')] },
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: {
        body: { ...CONTENIDO, state: 'BLOQUEADA' },
      },
    });

    expect(await screen.findByText('Día 1 · Superior A')).toBeVisible();
    expect(
      screen.getByText('Esperando asignación de entrenador'),
    ).toBeVisible();
  });

  it('permite reintentar la carga del contenido pendiente si falla', async () => {
    let attempts = 0;
    renderPage({
      [`GET /students/${STUDENT}/routines`]: { body: [rutina('PROPUESTA')] },
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: () => {
        attempts += 1;
        return attempts === 1
          ? { status: 503, body: { error: 'unavailable' } }
          : { body: { ...CONTENIDO, state: 'PROPUESTA' } };
      },
    });

    expect(
      await screen.findByText('No pudimos cargar el contenido de esta rutina'),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Día 1 · Superior A')).toBeVisible();
  });

  it('no presenta rutinas archivadas o rechazadas como pendientes', async () => {
    const fetchMock = renderPage({
      [`GET /students/${STUDENT}/routines`]: {
        body: [rutina('ARCHIVADA'), rutina('RECHAZADA')],
      },
    });

    expect(
      await screen.findByText('No tenés una rutina vigente'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Rutina pendiente de revisión' }),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([201, 409])(
    'actualiza el listado al finalizar con respuesta %i y muestra la propuesta',
    async (status) => {
      const requestId = '50000000-0000-4000-8000-000000000001';
      let proposed = false;
      renderPage(
        {
          [`GET /students/${STUDENT}/routines`]: () => ({
            body: proposed ? [rutina('PROPUESTA')] : [],
          }),
          [`GET /students/${STUDENT}/routines/${ROUTINE}`]: {
            body: { ...CONTENIDO, state: 'PROPUESTA' },
          },
          [`POST /students/${STUDENT}/routine-generations`]: {
            status: 202,
            body: { requestId, status: 'pending' },
          },
          [`GET /students/${STUDENT}/routine-generations/${requestId}`]: {
            body: {
              requestId,
              status: 'COMPLETADA',
              estructuraCandidata: null,
              violaciones: null,
              error: null,
            },
          },
          [`POST /students/${STUDENT}/routine-generations/${requestId}/finalize`]:
            () => {
              proposed = true;
              return status === 201
                ? { status, body: { routineId: ROUTINE, status: 'PROPUESTA' } }
                : {
                    status,
                    body: { error: 'proposed_routine_already_exists' },
                  };
            },
        },
        true,
      );

      await screen.findByText('No tenés una rutina vigente');
      fireEvent.change(screen.getByLabelText('Indicaciones'), {
        target: { value: 'Priorizar fuerza' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: 'Generar nueva rutina' }),
      );
      expect(await screen.findByText('Día 1 · Superior A')).toBeVisible();
      expect(screen.getByText('Pendiente de revisión')).toBeVisible();
      expect(
        await screen.findByRole('link', {
          name:
            status === 201 ? 'Ver rutina' : 'Ver rutina pendiente de revisión',
        }),
      ).toHaveAttribute('href', '/alumno/rutina');
    },
  );

  it('retoma una regeneración completada desde Mi rutina y reemplaza el contenido anterior', async () => {
    const requestId = '50000000-0000-4000-8000-000000000001';
    const newRoutineId = '60000000-0000-4000-8000-000000000002';
    localStorage.setItem(
      `gym:routine-generation:${STUDENT}`,
      JSON.stringify({
        idempotencyKey: 'regenerated-key',
        requestId,
        regenerate: true,
      }),
    );
    let finalized = false;
    renderPage(
      {
        [`GET /students/${STUDENT}/routines`]: () => ({
          body: [
            { ...rutina('PROPUESTA'), id: finalized ? newRoutineId : ROUTINE },
          ],
        }),
        [`GET /students/${STUDENT}/routines/${ROUTINE}`]: {
          body: { ...CONTENIDO, state: 'PROPUESTA' },
        },
        [`GET /students/${STUDENT}/routines/${newRoutineId}`]: {
          body: {
            ...CONTENIDO,
            id: newRoutineId,
            state: 'PROPUESTA',
            origin: 'GENERADA',
            days: [{ ...CONTENIDO.days[0], name: 'Rutina nueva desde API' }],
          },
        },
        [`GET /students/${STUDENT}/routine-generations/${requestId}`]: {
          body: {
            requestId,
            status: 'COMPLETADA',
            routineId: null,
            estructuraCandidata: null,
            violaciones: null,
            error: null,
          },
        },
        [`POST /students/${STUDENT}/routine-generations/${requestId}/finalize`]:
          () => {
            finalized = true;
            return {
              status: 201,
              body: { routineId: newRoutineId, status: 'PROPUESTA' },
            };
          },
      },
      true,
    );
    expect(
      await screen.findByText('Día 1 · Rutina nueva desde API'),
    ).toBeVisible();
    expect(screen.queryByText('Día 1 · Superior A')).not.toBeInTheDocument();
  });
});
