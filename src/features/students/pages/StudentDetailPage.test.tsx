import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import type { StudentStatus } from '../../../api/students';
import { StudentDetailPage } from './StudentDetailPage';

const JUAN = '20000000-0000-4000-8000-000000000006';

const blockedStatus: StudentStatus = {
  studentId: JUAN,
  displayName: 'Juan Pérez',
  bloqueado: true,
  measurementBlockState: 'PENDIENTE_APROBACION',
  motivoBloqueo: 'Bloqueo por alcanzar la 3ª falta consecutiva.',
  fechaUltimaMedicion: '2026-02-27',
  faltasConsecutivas: 3,
  blockedAt: '2026-09-01T10:00:00.000Z',
  submittedAt: '2026-09-02T10:00:00.000Z',
  alturaCm: 181,
};

function renderPage() {
  return renderRoute(
    '/entrenador/alumnos/:studentId',
    `/entrenador/alumnos/${JUAN}`,
    <StudentDetailPage />,
  );
}

describe('StudentDetailPage (HU05)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Esc. 1: muestra el motivo del bloqueo y la fecha de la última medición', async () => {
    mockApi({ [`GET /students/${JUAN}/status`]: { body: blockedStatus } });

    renderPage();

    expect(await screen.findByText('Alumno bloqueado')).toBeVisible();
    expect(screen.getByText(/3ª falta consecutiva/)).toBeVisible();
    expect(
      screen.getByText(/Última medición registrada: 27\/2\/2026/),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Aprobar desbloqueo' }),
    ).toBeEnabled();
  });

  it('aprueba la regularización ya cargada sin reenviar las métricas', async () => {
    let status = blockedStatus;
    const fetchMock = mockApi({
      [`GET /students/${JUAN}/status`]: () => ({ body: status }),
      [`POST /students/${JUAN}/unlock`]: () => {
        status = {
          ...blockedStatus,
          bloqueado: false,
          measurementBlockState: 'NORMAL',
          motivoBloqueo: null,
          faltasConsecutivas: 0,
          fechaUltimaMedicion: '2026-09-15',
          blockedAt: null,
          submittedAt: null,
        };
        return { body: status };
      },
    });

    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Aprobar desbloqueo' }),
    );

    expect(await screen.findByText('Alumno desbloqueado')).toBeVisible();
    const unlockCall = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(unlockCall?.[1]?.body))).toEqual({});
    await waitFor(() =>
      expect(screen.queryByText('Alumno bloqueado')).not.toBeInTheDocument(),
    );
  });

  it('muestra el rechazo del backend al aprobar', async () => {
    mockApi({
      [`GET /students/${JUAN}/status`]: { body: blockedStatus },
      [`POST /students/${JUAN}/unlock`]: {
        status: 409,
        body: { error: 'student_not_blocked' },
      },
    });

    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Aprobar desbloqueo' }),
    );

    expect(
      await screen.findByText('El alumno ya no está bloqueado.'),
    ).toBeVisible();
  });

  it('avisa cuando el alumno no está asignado al entrenador', async () => {
    mockApi({
      [`GET /students/${JUAN}/status`]: {
        status: 403,
        body: { error: 'forbidden_not_assigned' },
      },
    });

    renderPage();

    expect(
      await screen.findByText('Este alumno no está asignado a tu cartera.'),
    ).toBeVisible();
  });

  it('muestra una advertencia destacada cuando no hay mediciones', async () => {
    mockApi({
      [`GET /students/${JUAN}/status`]: {
        body: { ...blockedStatus, fechaUltimaMedicion: null },
      },
    });

    renderPage();

    expect(await screen.findByText('Sin mediciones registradas')).toBeVisible();
  });
});
