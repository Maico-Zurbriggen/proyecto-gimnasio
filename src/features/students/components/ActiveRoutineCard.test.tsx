import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActiveRoutineCard } from './ActiveRoutineCard';

const STUDENT_ID = '20000000-0000-4000-8000-000000000005';

function response(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function renderCard(studentUserId?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ActiveRoutineCard
          studentUserId={studentUserId}
          routineHref="/entrenador/alumnos/x/rutina"
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ActiveRoutineCard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('consulta la rutina del alumno como entrenador y muestra tipo, frecuencia y renovación', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response(200, {
        id: '22222222-2222-4222-a222-222222222222',
        studentId: STUDENT_ID,
        routineType: 'RESISTENCIA_MUSCULAR',
        targetWeeklyFrequency: 3,
        state: 'VIGENTE',
        origin: 'PLANTILLA_ENTRENADOR',
        startDate: '2026-05-01T00:00:00.000Z',
        renewalDate: '2026-06-30T00:00:00.000Z',
        duracionCicloDias: 60,
        diasRestantesRenovacion: -10,
        avisoRenovacion: {
          estado: 'vencido',
          diasRestantes: -10,
          fechaVencimiento: '2026-06-30T00:00:00.000Z',
        },
        currentVersionNumber: 2,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderCard(STUDENT_ID);

    expect(await screen.findByText('Resistencia muscular')).toBeVisible();
    expect(screen.getByText(/días por semana/).textContent).toBe(
      '3 días por semana · ciclo de 60 días · versión 2',
    );
    expect(screen.getByText(/Ciclo vencido hace 10 días/)).toBeVisible();
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(
      new RegExp(`/students/${STUDENT_ID}/routines/active$`),
    );
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

    renderCard(STUDENT_ID);

    expect(await screen.findByText('Sin rutina vigente')).toBeVisible();
  });

  it('no consulta el backend si el alumno no tiene usuario', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderCard(undefined);

    expect(
      screen.getByText('Este alumno no tiene usuario en el backend.'),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
