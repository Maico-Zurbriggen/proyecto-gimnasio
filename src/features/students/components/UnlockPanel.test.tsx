import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UnlockPanel } from './UnlockPanel';

const BLOCKED_STUDENT = {
  bloqueado: true,
  motivoBloqueo: '3 faltas consecutivas de medición.',
  fechaUltimaMedicion: '2026-03-01',
};

describe('UnlockPanel', () => {
  it('mantiene el botón de desbloqueo deshabilitado sin medición válida cargada', () => {
    const onUnlock = vi.fn();
    render(<UnlockPanel student={BLOCKED_STUDENT} onUnlock={onUnlock} />);

    const button = screen.getByRole('button', { name: 'Desbloquear alumno' });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onUnlock).not.toHaveBeenCalled();
  });

  it('habilita el botón cuando la medición cargada es válida y desbloquea al confirmar', () => {
    const onUnlock = vi.fn();
    render(<UnlockPanel student={BLOCKED_STUDENT} onUnlock={onUnlock} />);

    fireEvent.change(screen.getByLabelText('Peso (kg)'), {
      target: { value: '80' },
    });
    fireEvent.change(screen.getByLabelText('Altura (cm)'), {
      target: { value: '180' },
    });

    const button = screen.getByRole('button', { name: 'Desbloquear alumno' });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(onUnlock).toHaveBeenCalledWith({ weightKg: 80, heightCm: 180 });
  });

  it('no renderiza nada si el alumno no está bloqueado', () => {
    render(<UnlockPanel student={{ bloqueado: false }} onUnlock={vi.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'Desbloquear alumno' }),
    ).not.toBeInTheDocument();
  });
});
