import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RenewalBanner } from './RenewalBanner';

const STUDENT_ID = 'alumno-1';
const DAY_1 = new Date(2026, 0, 1);
const DAY_2 = new Date(2026, 0, 2);

describe('RenewalBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('no muestra nada cuando faltan 8 días o más', () => {
    render(
      <RenewalBanner
        studentId={STUDENT_ID}
        diasRestantesRenovacion={8}
        today={DAY_1}
      />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('muestra el aviso pendiente cuando faltan 7 días, y es descartable', () => {
    render(
      <RenewalBanner
        studentId={STUDENT_ID}
        diasRestantesRenovacion={7}
        today={DAY_1}
      />,
    );

    expect(screen.getByText('Tu rutina está por vencer')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Descartar' }),
    ).toBeInTheDocument();
  });

  it('al descartar, desaparece por el resto del día y reaparece al día siguiente', () => {
    const { rerender } = render(
      <RenewalBanner
        studentId={STUDENT_ID}
        diasRestantesRenovacion={7}
        today={DAY_1}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Mismo día: sigue oculto aunque el componente se vuelva a renderizar.
    rerender(
      <RenewalBanner
        studentId={STUDENT_ID}
        diasRestantesRenovacion={6}
        today={DAY_1}
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Día siguiente: el ciclo sigue sin renovarse, el aviso vuelve a aparecer.
    rerender(
      <RenewalBanner
        studentId={STUDENT_ID}
        diasRestantesRenovacion={6}
        today={DAY_2}
      />,
    );
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('indica "vence hoy" con un texto distinto del de pendiente el día del vencimiento', () => {
    render(
      <RenewalBanner
        studentId={STUDENT_ID}
        diasRestantesRenovacion={0}
        today={DAY_1}
      />,
    );

    expect(screen.getByText('Tu rutina vence hoy')).toBeVisible();
    expect(
      screen.queryByText('Tu rutina está por vencer'),
    ).not.toBeInTheDocument();
  });

  it('el aviso vencido no puede descartarse', () => {
    render(
      <RenewalBanner
        studentId={STUDENT_ID}
        diasRestantesRenovacion={-1}
        today={DAY_1}
      />,
    );

    expect(screen.getByText('Tu rutina venció')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Descartar' }),
    ).not.toBeInTheDocument();
  });
});
