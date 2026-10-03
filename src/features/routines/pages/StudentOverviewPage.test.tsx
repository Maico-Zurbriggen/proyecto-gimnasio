import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockApi, type MockResponse } from '../../../../test/apiMocks';

import { StudentOverviewPage } from './StudentOverviewPage';

const STUDENT_ID = '20000000-0000-4000-8000-000000000004';

function activeRoutine(diasRestantesRenovacion: number) {
  return {
    id: '22222222-2222-4222-a222-222222222222',
    studentId: STUDENT_ID,
    routineType: 'HIPERTROFIA',
    targetWeeklyFrequency: 4,
    state: 'VIGENTE',
    origin: 'PLANTILLA_ENTRENADOR',
    startDate: '2026-07-20T00:00:00.000Z',
    renewalDate: '2026-09-18T00:00:00.000Z',
    duracionCicloDias: 60,
    diasRestantesRenovacion,
    avisoRenovacion: {
      estado:
        diasRestantesRenovacion > 0
          ? 'pendiente'
          : diasRestantesRenovacion === 0
            ? 'cerrado hoy'
            : 'vencido',
      diasRestantes: diasRestantesRenovacion,
      fechaVencimiento: '2026-09-18T00:00:00.000Z',
    },
    currentVersionNumber: 1,
  };
}

function mockOverview(
  active: MockResponse | (() => MockResponse),
  routines: unknown[] = [],
  content?: unknown,
) {
  return mockApi({
    'GET /routines/active': active,
    [`GET /students/${STUDENT_ID}/routines`]: { body: routines },
    [`GET /students/${STUDENT_ID}/routines/22222222-2222-4222-a222-222222222222`]:
      { body: content },
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudentOverviewPage studentId={STUDENT_ID} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StudentOverviewPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el aviso con los días restantes que devuelve GET /routines/active', async () => {
    const fetchMock = mockOverview({ body: activeRoutine(3) });

    renderPage();

    expect(await screen.findByText('Tu rutina está por vencer')).toBeVisible();
    expect(screen.getByText(/Faltan 3 días/)).toBeVisible();
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/routines\/active$/);
  });

  it('no muestra aviso cuando el ciclo está lejos de vencer', async () => {
    mockOverview({ body: activeRoutine(30) });

    renderPage();

    await screen.findByRole('heading', { name: 'Tu entrenamiento' });
    await vi.waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('declara que no hay rutina vigente cuando el backend responde 404', async () => {
    mockOverview({ status: 404, body: { error: 'active_routine_not_found' } });

    renderPage();

    expect(
      await screen.findByText('Todavía no tenés una rutina vigente'),
    ).toBeVisible();
  });

  it('ante un error permite reintentar la consulta', async () => {
    let attempts = 0;
    const fetchMock = mockOverview(() => {
      attempts += 1;
      return attempts === 1
        ? { status: 500, body: { error: 'internal_server_error' } }
        : { body: activeRoutine(0) };
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Tu rutina vence hoy')).toBeVisible();
    expect(
      fetchMock.mock.calls.filter(([url]) => url.endsWith('/routines/active')),
    ).toHaveLength(2);
  });

  it('muestra días y ejercicios de la propuesta real sin datos de ejemplo', async () => {
    const summary = {
      ...activeRoutine(30),
      state: 'PROPUESTA',
      origin: 'GENERADA',
      requestedAt: '2026-09-30T18:00:00.000Z',
      versionId: 'version-1',
      versionNumber: 1,
    };
    const content = {
      ...summary,
      generationPrompt: 'Priorizar tren inferior con tres días disponibles',
      days: [
        {
          position: 1,
          name: 'Piernas desde API',
          dominantPattern: 'DOMINANTE_CADERA',
          exercises: [
            {
              position: 1,
              exerciseId: 'exercise-1',
              exerciseName: 'Peso muerto rumano desde API',
              movementPattern: 'DOMINANTE_CADERA',
              note: null,
              sets: [],
            },
          ],
        },
      ],
    };
    const fetchMock = mockOverview(
      { body: activeRoutine(30) },
      [summary],
      content,
    );
    renderPage();
    expect(await screen.findByText('Día 1 · Piernas desde API')).toBeVisible();
    expect(screen.getByText('Peso muerto rumano desde API')).toBeVisible();
    expect(screen.getByText(content.generationPrompt)).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Rutina pendiente de revisión' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Ver rutina completa' }),
    ).toHaveAttribute('href', '/alumno/rutina');
    expect(screen.queryByText('Remo con barra')).not.toBeInTheDocument();
    expect(screen.queryByText('Vas 7 de 8')).not.toBeInTheDocument();
    expect(screen.queryByText('62,5 kg')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/students/${STUDENT_ID}/routines/${summary.id}`),
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
