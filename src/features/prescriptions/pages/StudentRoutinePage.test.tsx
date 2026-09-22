import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, type MockResponse } from '../../../../test/apiMocks';
import * as sessionHook from '../../auth/hooks/useSession';
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

function renderPage(routes: Record<string, MockResponse>) {
  vi.spyOn(sessionHook, 'useSession').mockReturnValue({
    user: { id: STUDENT, gymId: 'gym-1', roles: ['ALUMNO'] },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    adoptSession: vi.fn(),
  });
  mockApi(routes);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/alumno/rutina']}>
        <StudentRoutinePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StudentRoutinePage (RF-026)', () => {
  afterEach(() => {
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

  it('una propuesta sin aprobar no se le muestra al alumno', async () => {
    renderPage({
      [`GET /students/${STUDENT}/routines`]: { body: [rutina('PROPUESTA')] },
    });

    expect(
      await screen.findByText('No tenés una rutina vigente'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Día 1 · Superior A')).not.toBeInTheDocument();
  });
});
