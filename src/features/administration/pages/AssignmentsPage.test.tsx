import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { AssignmentsPage } from './AssignmentsPage';

const LUCIA = '21000000-0000-4000-8000-000000000002';
const NUEVO = '21000000-0000-4000-8000-000000000010';

const OVERVIEW = {
  students: [
    {
      studentId: '21000000-0000-4000-8000-000000000004',
      displayName: 'Martín',
      email: 'martin@test.com',
      trainer: { id: LUCIA, displayName: 'Lucía' },
      assignedAt: '2026-08-01T10:00:00.000Z',
    },
    {
      studentId: NUEVO,
      displayName: 'Nuevo Alumno',
      email: 'nuevo@test.com',
      trainer: null,
      assignedAt: null,
    },
  ],
  trainers: [{ id: LUCIA, displayName: 'Lucía', studentCount: 1 }],
};

describe('AssignmentsPage (RF-066)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra primero a los alumnos sin entrenador y permite asignarlo', async () => {
    const fetchMock = mockApi({
      'GET /admin/assignments': { body: OVERVIEW },
      [`PUT /admin/students/${NUEVO}/trainer`]: {
        body: {
          studentId: NUEVO,
          trainer: { id: LUCIA, displayName: 'Lucía' },
          previousTrainerId: null,
          unblockedRoutines: 1,
          unblockedProposals: 0,
        },
      },
    });
    renderRoute(
      '/admin/asignaciones',
      '/admin/asignaciones',
      <AssignmentsPage />,
    );

    const filas = await screen.findAllByRole('listitem');
    expect(within(filas[0]!).getByText('Nuevo Alumno')).toBeVisible();
    expect(
      within(filas[0]!).getByText(/Sin entrenador asignado/),
    ).toBeVisible();
    expect(screen.getByText('1 alumno sin entrenador')).toBeVisible();

    const asignar = within(filas[0]!).getByRole('button', { name: 'Asignar' });
    expect(asignar).toBeDisabled();
    fireEvent.change(
      within(filas[0]!).getByLabelText('Entrenador para Nuevo Alumno'),
      { target: { value: LUCIA } },
    );
    fireEvent.click(asignar);

    expect(
      await screen.findByText(/Asignado a Lucía\. Sus rutinas pendientes/),
    ).toBeVisible();
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ trainerId: LUCIA });
  });

  it('ofrece reintentar si falla la carga', async () => {
    mockApi({
      'GET /admin/assignments': { status: 500, body: { error: 'x' } },
    });
    renderRoute(
      '/admin/asignaciones',
      '/admin/asignaciones',
      <AssignmentsPage />,
    );

    expect(
      await screen.findByRole('button', { name: 'Reintentar' }),
    ).toBeVisible();
  });
});
