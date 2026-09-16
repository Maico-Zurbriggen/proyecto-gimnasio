import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

function response(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudentOverviewPage />
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
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response(200, activeRoutine(3)));
    vi.stubGlobal('fetch', fetchMock);

    renderPage();

    expect(await screen.findByText('Tu rutina está por vencer')).toBeVisible();
    expect(screen.getByText(/Faltan 3 días/)).toBeVisible();
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/routines\/active$/);
  });

  it('no muestra aviso cuando el ciclo está lejos de vencer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(200, activeRoutine(30))),
    );

    renderPage();

    await screen.findByRole('heading', { name: 'Buen día, Maia.' });
    await vi.waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('declara que no hay rutina vigente cuando el backend responde 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response(404, { error: 'active_routine_not_found' }),
        ),
    );

    renderPage();

    expect(
      await screen.findByText('Todavía no tenés una rutina vigente'),
    ).toBeVisible();
  });

  it('ante un error permite reintentar la consulta', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(500, { error: 'internal_server_error' }))
      .mockResolvedValueOnce(response(200, activeRoutine(0)));
    vi.stubGlobal('fetch', fetchMock);

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Tu rutina vence hoy')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
