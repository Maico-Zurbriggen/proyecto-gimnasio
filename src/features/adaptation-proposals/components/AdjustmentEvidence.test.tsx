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
    expect(summary).toContain('Objetivo nuevo: HIPERTROFIA');
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
    expect(summary).toContain('Dato faltante: medicion corporal');
    expect(summary).toContain('Sin datos actualizados: Sí');
  });

  it('limita a 3 datos, oculta ids y declara el resto', () => {
    const summary = adjustmentEvidenceSummary({
      type: 'CARGA',
      exerciseName: 'Sentadilla',
      criterion: 'Criterio X.',
      supportingData: {
        goalId: 'abc',
        exerciseId: 'zzz',
        sesionesConsideradas: 6,
        variacionE1RM: 0.8,
        sinDatos: false,
        otro: 1,
        lista: [1, 2],
      },
    });
    expect(summary).toContain('Sentadilla: Criterio X.');
    expect(summary).toContain('Sesiones consideradas: 6');
    expect(summary).toContain('+1 más');
    expect(summary).not.toMatch(/abc|zzz|Goal|Exercise id/i);
  });

  it('explica el dato faltante y muestra un cero real como 0', () => {
    render(
      <AdjustmentEvidence
        type="CARGA"
        criterion="Criterio."
        supportingData={{ variacionE1RM: null, faltas: 0 }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Falta información: variacion e1 rm',
    );
    expect(screen.getByText('0')).toBeVisible();
  });
});

describe('ajustes de la tabla situación → ajuste', () => {
  it('muestra el criterio en palabras y oculta datos técnicos', () => {
    render(
      <AdjustmentEvidence
        type="VOLUMEN"
        criterion="ESTANCAMIENTO_PRIMERO"
        supportingData={{
          situation: 'ESTANCAMIENTO',
          exerciseId: 'ex-1',
          exerciseName: 'Press banca',
          consecutiveStagnations: 1,
          tableVersion: 'adjustment-table-v1',
        }}
      />,
    );
    expect(
      screen.getByText(/Estancamiento \(primer diagnóstico\)/),
    ).toBeVisible();
    expect(
      screen.getByText(/Diagnósticos de estancamiento seguidos:/),
    ).toBeVisible();
    expect(screen.queryByText(/adjustment-table-v1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ex-1/)).not.toBeInTheDocument();
  });

  it('resume la bandeja con el criterio traducido', () => {
    expect(
      adjustmentEvidenceSummary({
        type: 'CARGA',
        exerciseName: 'Press banca',
        criterion: 'ESTIMULO_INSUFICIENTE',
        supportingData: {},
      }),
    ).toBe('Press banca: Estímulo insuficiente');
  });
});
