import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../src/App';
import { mockApi } from './apiMocks';

const JUAN = '20000000-0000-4000-8000-000000000006';

const juanStatus = {
  studentId: JUAN,
  displayName: 'Juan Pérez',
  bloqueado: true,
  motivoBloqueo: 'Bloqueo por alcanzar la 3ª falta consecutiva.',
  fechaUltimaMedicion: '2026-02-27',
  faltasConsecutivas: 3,
  alturaCm: 181,
};

describe('App', () => {
  beforeEach(() => {
    mockApi({
      // HU07: la app exige sesión; sin ella el router redirige al login.
      'GET /auth/me': {
        body: {
          user: { id: JUAN, gymId: 'gym-1', roles: ['ALUMNO', 'ENTRENADOR'] },
        },
      },
      'GET /routines/active': {
        status: 404,
        body: { error: 'active_routine_not_found' },
      },
      'GET /trainers/me/students': {
        body: [
          {
            ...juanStatus,
            objetivo: 'HIPERTROFIA',
            rutinaVigente: null,
            propuestasPendientes: 0,
          },
        ],
      },
      [`GET /students/${JUAN}/status`]: { body: juanStatus },
      [`GET /students/${JUAN}/routines/active`]: {
        status: 404,
        body: { error: 'active_routine_not_found' },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirige a la vista prioritaria permitida por los roles de la sesión', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Tus alumnos, por señal.' }),
    ).toBeVisible();
  });

  it('permite ir a la cartera del entrenador y abrir la ficha de un alumno bloqueado', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Tus alumnos, por señal.' }),
    ).toBeVisible();

    fireEvent.click(await screen.findByText('Juan Pérez'));
    expect(
      await screen.findByRole('heading', { name: 'Juan Pérez' }),
    ).toBeVisible();
    expect(await screen.findByText('Alumno bloqueado')).toBeVisible();
  });
});
