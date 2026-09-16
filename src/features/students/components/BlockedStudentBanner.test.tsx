import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BlockedStudentBanner } from './BlockedStudentBanner';

describe('BlockedStudentBanner', () => {
  it('no muestra nada si el alumno no está bloqueado', () => {
    render(<BlockedStudentBanner student={{ bloqueado: false }} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('muestra motivo y fecha de última medición cuando está bloqueado', () => {
    render(
      <BlockedStudentBanner
        student={{
          bloqueado: true,
          motivoBloqueo: '3 faltas consecutivas de medición.',
          fechaUltimaMedicion: '2026-06-01',
        }}
      />,
    );

    expect(screen.getByText(/3 faltas consecutivas/)).toBeVisible();
    expect(screen.getByText(/Última medición registrada/)).toBeVisible();
  });
});
