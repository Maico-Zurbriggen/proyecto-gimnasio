import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UnlockPanel } from './UnlockPanel';

const BLOCKED_STUDENT = {
  bloqueado: true,
  measurementBlockState: 'PENDIENTE_MEDICION' as const,
  motivoBloqueo: '3 faltas consecutivas de medición.',
  fechaUltimaMedicion: '2026-03-01',
  submittedAt: null,
};

describe('UnlockPanel', () => {
  it('keeps approval disabled until the student submits measurements', () => {
    const onUnlock = vi.fn();
    render(<UnlockPanel student={BLOCKED_STUDENT} onUnlock={onUnlock} />);

    const button = screen.getByRole('button', {
      name: 'Aprobar desbloqueo',
    });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(/debe cargar personalmente el peso y la altura/),
    ).toBeVisible();
  });

  it('enables approval after the student submitted both measurements', () => {
    const onUnlock = vi.fn();
    render(
      <UnlockPanel
        student={{
          ...BLOCKED_STUDENT,
          measurementBlockState: 'PENDIENTE_APROBACION',
          submittedAt: '2026-09-20T10:00:00.000Z',
        }}
        onUnlock={onUnlock}
      />,
    );

    const button = screen.getByRole('button', {
      name: 'Aprobar desbloqueo',
    });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onUnlock).toHaveBeenCalledWith();
  });

  it('renders nothing for an unblocked student', () => {
    render(<UnlockPanel student={{ bloqueado: false }} onUnlock={vi.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'Aprobar desbloqueo' }),
    ).not.toBeInTheDocument();
  });
});
