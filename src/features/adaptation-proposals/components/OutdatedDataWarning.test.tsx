import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OutdatedDataWarning } from './OutdatedDataWarning';

describe('OutdatedDataWarning', () => {
  it('no muestra nada cuando la propuesta tiene datos actualizados', () => {
    render(
      <OutdatedDataWarning
        proposal={{
          sinDatosActualizados: false,
          faltasConsecutivas: 0,
          alcanzoTopeDeFaltas: false,
        }}
      />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('muestra la advertencia con el dato faltante y las faltas consecutivas', () => {
    render(
      <OutdatedDataWarning
        proposal={{
          sinDatosActualizados: true,
          datoFaltante: 'medicion corporal posterior al inicio del ciclo',
          faltasConsecutivas: 1,
          alcanzoTopeDeFaltas: false,
        }}
      />,
    );

    expect(
      screen.getByText('Propuesta generada sin datos actualizados'),
    ).toBeVisible();
    expect(
      screen.getByText(/medicion corporal posterior al inicio del ciclo/),
    ).toBeVisible();
    expect(screen.getByText(/1 falta consecutiva/)).toBeVisible();
    expect(screen.queryByText(/Alcanzó el tope/)).not.toBeInTheDocument();
  });

  it('avisa cuando el alumno alcanzó el tope de faltas', () => {
    render(
      <OutdatedDataWarning
        proposal={{
          sinDatosActualizados: true,
          faltasConsecutivas: 3,
          alcanzoTopeDeFaltas: true,
        }}
      />,
    );

    expect(screen.getByText(/3 faltas consecutivas/)).toBeVisible();
    expect(screen.getByText(/Alcanzó el tope de faltas/)).toBeVisible();
  });
});
