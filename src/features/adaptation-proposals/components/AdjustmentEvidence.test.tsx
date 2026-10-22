import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AdjustmentEvidence,
  adjustmentEvidenceSummary,
} from './AdjustmentEvidence';

describe('AdjustmentEvidence (T3 · RF-090)', () => {
  it('muestra criterio y dato de un ajuste de carga', () => {
    render(
      <AdjustmentEvidence
        type="CARGA"
        criterion="Estancamiento: variación +0,8% < +2,5% (RN-79a)."
        supportingData={{ sesionesConsideradas: 6, variacionE1RM: 0.8 }}
      />,
    );
    expect(screen.getByText(/Estancamiento/)).toBeVisible();
    expect(screen.getByText(/Sesiones consideradas:/)).toBeVisible();
    expect(
      screen.queryByText(/"sesionesConsideradas"/),
    ).not.toBeInTheDocument();
  });

  it('declara la ausencia de dato sin inventar (RN-73)', () => {
    render(
      <AdjustmentEvidence
        type="VOLUMEN"
        criterion="Criterio."
        supportingData={{}}
      />,
    );
    expect(screen.getByText(/sin datos adicionales declarados/i)).toBeVisible();
  });

  it('resume objetivo nuevo para la bandeja (T2)', () => {
    const summary = adjustmentEvidenceSummary({
      type: 'ESTRUCTURA',
      exerciseName: null,
      criterion:
        'Cambio de objetivo de FUERZA a HIPERTROFIA: se propone el tipo de rutina HIPERTROFIA (RN-89a).',
      supportingData: {
        objetivoNuevo: 'HIPERTROFIA',
        motivo: 'CAMBIO_OBJETIVO',
      },
    });
    expect(summary).toContain('HIPERTROFIA');
    expect(summary).toContain('Cambio de objetivo');
  });

  it('resume dato faltante de renovación para la bandeja', () => {
    const summary = adjustmentEvidenceSummary({
      type: 'ESTRUCTURA',
      exerciseName: null,
      criterion: 'Renovación automática por ciclo cumplido.',
      supportingData: {
        sinDatosActualizados: true,
        datoFaltante: 'medicion corporal posterior al inicio del ciclo',
      },
    });
    expect(summary).toContain('falta:');
  });
});
