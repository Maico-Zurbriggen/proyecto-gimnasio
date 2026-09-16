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

  it('redirige a la vista de alumno por defecto y muestra el resumen', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Buen día, Maia.' }),
    ).toBeVisible();
  });

  it('permite ir a la cartera del entrenador y abrir la ficha de un alumno bloqueado', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: 'Entrenador' }));
    expect(
      screen.getByRole('heading', { name: 'Tus alumnos, por señal.' }),
    ).toBeVisible();

    fireEvent.click(await screen.findByText('Juan Pérez'));
    expect(
      await screen.findByRole('heading', { name: 'Juan Pérez' }),
    ).toBeVisible();
    expect(await screen.findByText('Alumno bloqueado')).toBeVisible();
  });
});
