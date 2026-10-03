import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PasswordRequirementsList } from './PasswordRequirementsList';

describe('PasswordRequirementsList (HU06 - T4)', () => {
  it('muestra los cuatro requisitos aunque la contraseña esté vacía', () => {
    render(<PasswordRequirementsList password="" />);

    expect(
      screen.getByLabelText('Requisitos de la contraseña'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('req-min-length')).toHaveAttribute(
      'data-passed',
      'false',
    );
    expect(screen.getByTestId('req-uppercase')).toHaveAttribute(
      'data-passed',
      'false',
    );
    expect(screen.getByTestId('req-lowercase')).toHaveAttribute(
      'data-passed',
      'false',
    );
    expect(screen.getByTestId('req-number')).toHaveAttribute(
      'data-passed',
      'false',
    );
  });

  it('marca sólo los requisitos que la contraseña cumple', () => {
    render(<PasswordRequirementsList password="clavelarga" />);

    expect(screen.getByTestId('req-min-length')).toHaveAttribute(
      'data-passed',
      'true',
    );
    expect(screen.getByTestId('req-lowercase')).toHaveAttribute(
      'data-passed',
      'true',
    );
    expect(screen.getByTestId('req-uppercase')).toHaveAttribute(
      'data-passed',
      'false',
    );
    expect(screen.getByTestId('req-number')).toHaveAttribute(
      'data-passed',
      'false',
    );
  });

  it('marca los cuatro con una contraseña válida', () => {
    render(<PasswordRequirementsList password="ClaveSegura2026" />);

    for (const id of ['min-length', 'uppercase', 'lowercase', 'number']) {
      expect(screen.getByTestId(`req-${id}`)).toHaveAttribute(
        'data-passed',
        'true',
      );
    }
  });
});
