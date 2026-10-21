import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '../../../../test/apiMocks';
import { TrainingHistoryPage } from './TrainingHistoryPage';

const STUDENT_ID = '11111111-1111-4111-a111-111111111111';

function historyPage(items: unknown[], total?: number) {
  return {
    items,
    total: total ?? items.length,
    page: 1,
    pageSize: 10,
  };
}

function summary(overrides: Record<string, unknown> = {}) {
  return {
    id: '22222222-2222-4222-a222-222222222222',
    studentId: STUDENT_ID,
    routineDayName: 'Día 1',
    routineDayPosition: 1,
    state: 'COMPLETADA',
    startedAt: '2026-10-21T17:08:46.781Z',
    completedAt: '2026-10-21T17:35:10.000Z',
    occurredOn: '2026-10-21',
    totalSeries: 10,
    completedSeries: 8,
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TrainingHistoryPage studentId={STUDENT_ID} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TrainingHistoryPage (RF-035, D4/PD-02)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('muestra estado vacío cuando no hay sesiones', async () => {
    mockApi({
      [`GET /students/${STUDENT_ID}/training-sessions`]: {
        body: historyPage([]),
      },
    });
    renderPage();

    expect(
      await screen.findByText(/sin sesiones todavía/i),
    ).toBeInTheDocument();
  });

  it('lista sesiones con estado, series y duración', async () => {
    mockApi({
      [`GET /students/${STUDENT_ID}/training-sessions`]: {
        body: historyPage([
          summary(),
          summary({
            id: '33333333-3333-4333-a333-333333333333',
            state: 'ABANDONADA',
            completedSeries: 3,
            completedAt: '2026-10-21T17:18:46.781Z',
          }),
        ]),
      },
    });
    renderPage();

    expect(await screen.findByText(/8 de 10 series/i)).toBeInTheDocument();
    expect(screen.getByText('Completada')).toBeInTheDocument();
    expect(screen.getByText('Abandonada')).toBeInTheDocument();
    // 26 min entre inicio y cierre de la primera; 10 en la segunda.
    expect(screen.getByText(/· 26 min/i)).toBeInTheDocument();
    expect(screen.getByText(/· 10 min/i)).toBeInTheDocument();
  });

  it('muestra reintentar ante error de consulta', async () => {
    mockApi({
      [`GET /students/${STUDENT_ID}/training-sessions`]: {
        status: 500,
        body: { error: 'internal_server_error' },
      },
    });
    renderPage();

    expect(
      await screen.findByRole('button', { name: /reintentar/i }),
    ).toBeInTheDocument();
  });

  it('expande el detalle con prescripto vs ejecutado', async () => {
    mockApi({
      [`GET /students/${STUDENT_ID}/training-sessions`]: {
        body: historyPage([summary()]),
      },
      [`GET /students/${STUDENT_ID}/training-sessions/22222222-2222-4222-a222-222222222222`]:
        {
          body: {
            id: '22222222-2222-4222-a222-222222222222',
            studentId: STUDENT_ID,
            routineId: '44444444-4444-4444-a444-444444444444',
            routineVersionId: '55555555-5555-4555-a555-555555555555',
            routineDayId: '66666666-6666-4666-a666-666666666666',
            routineDayName: 'Día 1',
            routineDayPosition: 1,
            state: 'COMPLETADA',
            startedAt: '2026-10-21T17:08:46.781Z',
            completedAt: '2026-10-21T17:35:10.000Z',
            occurredOn: '2026-10-21',
            lastActivityAt: '2026-10-21T17:35:10.000Z',
            aptitudeWarning: null,
            compatibilityWarnings: [],
            setRecords: [
              {
                position: 1,
                prescribedExerciseId: '77777777-7777-4777-a777-777777777777',
                prescribedExerciseName: 'Sentadilla',
                performedExerciseId: '77777777-7777-4777-a777-777777777777',
                performedExerciseName: 'Sentadilla',
                prescribedMinRepetitions: 6,
                prescribedMaxRepetitions: 12,
                prescribedLoad: 20,
                warmup: false,
                performedLoad: 22.5,
                performedRepetitions: 10,
                perceivedEffort: 7,
                completed: true,
                additional: false,
                omissionReason: null,
                atypicalConfirmed: false,
              },
            ],
          },
        },
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: /ver detalle/i }),
    );

    expect(
      await screen.findByText(/prescripto: 6–12 reps/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ejecutado: 10 reps · 22.5 kg/i),
    ).toBeInTheDocument();
  });

  it('filtra por estado y pagina', async () => {
    const fetchMock = mockApi({
      [`GET /students/${STUDENT_ID}/training-sessions`]: {
        body: historyPage([summary()]),
      },
    });
    renderPage();

    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), {
      target: { value: 'COMPLETADA' },
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes('state=COMPLETADA'),
        ),
      ).toBe(true);
    });
  });
});
