import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../src/App';

describe('App', () => {
  beforeEach(() => {
    // Sin backend en los tests: el resumen del alumno recibe "sin rutina".
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'active_routine_not_found' }),
      }),
    );
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

  it('permite ir a la cartera del entrenador y abrir la ficha de un alumno bloqueado', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: 'Entrenador' }));
    expect(
      screen.getByRole('heading', { name: 'Tus alumnos, por señal.' }),
    ).toBeVisible();

    fireEvent.click(screen.getByText('Juan Pérez'));
    expect(screen.getByRole('heading', { name: 'Juan Pérez' })).toBeVisible();
    expect(screen.getByText('Alumno bloqueado')).toBeVisible();
  });
});
