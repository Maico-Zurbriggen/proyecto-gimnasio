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
  motivoBloqueo: 'Bloqueo por alcanzar la 3ª falta consecutiva.',
  fechaUltimaMedicion: '2026-02-27',
  faltasConsecutivas: 3,
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
      screen.getByRole('button', { name: 'Desbloquear alumno' }),
    ).toBeDisabled();
  });

  it('Esc. 3 y 4: con peso y altura válidos desbloquea contra el backend', async () => {
    let status = blockedStatus;
    const fetchMock = mockApi({
      [`GET /students/${JUAN}/status`]: () => ({ body: status }),
      [`POST /students/${JUAN}/unlock`]: () => {
        status = {
          ...blockedStatus,
          bloqueado: false,
          motivoBloqueo: null,
          faltasConsecutivas: 0,
          fechaUltimaMedicion: '2026-09-15',
        };
        return { body: status };
      },
    });

    renderPage();

    fireEvent.change(await screen.findByLabelText('Peso (kg)'), {
      target: { value: '82.5' },
    });
    fireEvent.change(screen.getByLabelText('Altura (cm)'), {
      target: { value: '181' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Desbloquear alumno' }));

    expect(await screen.findByText('Alumno desbloqueado')).toBeVisible();
    const unlockCall = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(unlockCall?.[1]?.body))).toEqual({
      weightKg: 82.5,
      heightCm: 181,
    });
    await waitFor(() =>
      expect(screen.queryByText('Alumno bloqueado')).not.toBeInTheDocument(),
    );
  });

  it('muestra el rechazo del backend sin perder el formulario', async () => {
    mockApi({
      [`GET /students/${JUAN}/status`]: { body: blockedStatus },
      [`POST /students/${JUAN}/unlock`]: {
        status: 409,
        body: { error: 'student_not_blocked' },
      },
    });

    renderPage();

    fireEvent.change(await screen.findByLabelText('Peso (kg)'), {
      target: { value: '80' },
    });
    fireEvent.change(screen.getByLabelText('Altura (cm)'), {
      target: { value: '180' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Desbloquear alumno' }));

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
});
