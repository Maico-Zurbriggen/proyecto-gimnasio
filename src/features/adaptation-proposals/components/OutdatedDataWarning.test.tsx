import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OutdatedDataWarning } from './OutdatedDataWarning';

describe('OutdatedDataWarning', () => {
  it('no muestra nada cuando la propuesta tiene datos actualizados', () => {
    render(<OutdatedDataWarning proposal={{ sinDatosActualizados: false }} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('muestra la advertencia cuando falta una medición posterior al ciclo', () => {
    render(
      <OutdatedDataWarning
        proposal={{
          sinDatosActualizados: true,
          datoFaltante: 'peso y altura posteriores al inicio del ciclo',
        }}
      />,
    );

    expect(
      screen.getByText('Propuesta generada sin datos actualizados'),
    ).toBeVisible();
    expect(
      screen.getByText(/peso y altura posteriores al inicio del ciclo/),
    ).toBeVisible();
  });
});
