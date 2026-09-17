import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PasswordRequirementsList } from './PasswordRequirementsList';

describe('PasswordRequirementsList (HU06 - T4)', () => {
  it('muestra los 4 requisitos con estado no superado para contraseña vacía', () => {
    render(<PasswordRequirementsList password="" />);

    expect(screen.getByTestId('req-min-length')).toHaveTextContent(
      'Al menos 8 caracteres',
    );
    expect(screen.getByTestId('req-uppercase')).toHaveTextContent(
      'Una letra mayúscula (A-Z)',
    );
    expect(screen.getByTestId('req-lowercase')).toHaveTextContent(
      'Una letra minúscula (a-z)',
    );
    expect(screen.getByTestId('req-number')).toHaveTextContent(
      'Un número (0-9)',
    );
  });

  it('actualiza el estado de los requisitos al satisfacerlos', () => {
    render(<PasswordRequirementsList password="Password1" />);

    expect(screen.getByTestId('req-min-length')).toHaveTextContent('✓');
    expect(screen.getByTestId('req-uppercase')).toHaveTextContent('✓');
    expect(screen.getByTestId('req-lowercase')).toHaveTextContent('✓');
    expect(screen.getByTestId('req-number')).toHaveTextContent('✓');
  });
});
