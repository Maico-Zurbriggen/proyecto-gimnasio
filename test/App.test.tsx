import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../src/App';

describe('App', () => {
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
