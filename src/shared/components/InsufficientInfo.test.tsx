import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { parseInsufficientInfo } from '../lib/insufficient-info';
import { InsufficientInfo } from './InsufficientInfo';

describe('InsufficientInfo', () => {
  it('explica cuánto falta y qué hacer', () => {
    render(
      <InsufficientInfo
        missing="del mismo ejercicio"
        unit="sesiones"
        required={4}
        available={1}
        action="Registrá más sesiones."
      />,
    );
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent(
      'Hacen falta 4 sesiones (del mismo ejercicio). Tenés 1. Registrá más sesiones.',
    );
  });

  it('sin cantidades usa texto genérico', () => {
    render(<InsufficientInfo missing="adherencia" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Falta información: adherencia.',
    );
  });

  it('parsea el estado del backend y rechaza otros valores', () => {
    expect(
      parseInsufficientInfo({
        status: 'SIN_DATOS_SUFICIENTES',
        missing: 'x',
        required: 4,
      }),
    ).toMatchObject({ missing: 'x', required: 4 });
    expect(parseInsufficientInfo({ status: 'OK' })).toBeNull();
    expect(parseInsufficientInfo(0)).toBeNull();
  });
});
