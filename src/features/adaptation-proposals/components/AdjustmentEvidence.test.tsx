import { render, screen, within } from '@testing-library/react';
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
    expect(screen.getByText('Sesiones consideradas')).toBeVisible();
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
    expect(screen.getByText('Sin datos comparables')).toBeVisible();
    expect(screen.getByText('0')).toBeVisible();
  });
});

describe('ajustes de la tabla situación → ajuste', () => {
  it('shows real nested session metrics and includes the data in the inbox summary', () => {
    const supportingData = {
      situation: 'ESTIMULO_INSUFICIENTE',
      metrics: {
        sesionesConsideradas: 4,
        variacionCargaMaxima: 0,
        cumplimientoRepeticionesPorSesion: [100, 100, 100, 100],
        esfuerzoMedioPorSesion: [4, null, 4, 4],
        exerciseId: 'hidden-nested-id',
      },
    };
    render(
      <AdjustmentEvidence
        type="CARGA"
        criterion="ESTIMULO_INSUFICIENTE"
        supportingData={supportingData}
      />,
    );
    const rows = within(
      screen.getByRole('table', { name: 'Métricas por sesión' }),
    ).getAllByRole('row');
    expect(rows).toHaveLength(5);
    expect(within(rows[1]!).getByText('100 %')).toBeVisible();
    expect(within(rows[1]!).getByText('4 / 10')).toBeVisible();
    expect(within(rows[2]!).getByText('Sin registrar')).toBeVisible();
    expect(screen.getByText('0 %')).toBeVisible();
    expect(screen.getByText('Estímulo insuficiente')).toBeVisible();
    expect(
      screen.queryByText(/Información complementaria|hidden-nested-id/),
    ).not.toBeInTheDocument();
    const summary = adjustmentEvidenceSummary({
      type: 'CARGA',
      exerciseName: 'Press',
      criterion: 'ESTIMULO_INSUFICIENTE',
      supportingData,
    });
    expect(summary).toContain('Sesiones consideradas: 4');
    expect(summary).toContain('Variación de carga máxima estimada (%): 0');
  });

  it('formatea las métricas variadas con unidades, precisión y orden cronológico', () => {
    render(
      <AdjustmentEvidence
        type="ESQUEMA"
        criterion="ESTANCAMIENTO_PRIMERO"
        supportingData={{
          situation: 'ESTANCAMIENTO',
          consecutiveStagnations: 1,
          metrics: {
            sesionesConsideradas: 4,
            variacionCargaMaxima: 2.49,
            cumplimientoRepeticionesPorSesion: [75, 83.33, 91.67, 83.33],
            esfuerzoMedioPorSesion: [7, 6.67, 8.33, 7.67],
            criteriosNoEvaluados: [],
          },
        }}
      />,
    );
    expect(screen.getByText('+2,49 %')).toBeVisible();
    expect(screen.getByText('83,33 %', { selector: 'dd' })).toBeVisible();
    expect(screen.getByText('7,42 / 10', { selector: 'dd' })).toBeVisible();
    expect(screen.getByText('Estancamiento')).toBeVisible();
    expect(screen.queryByText('ESTANCAMIENTO')).not.toBeInTheDocument();
    expect(screen.getByText('Criterios no evaluados: ninguno.')).toBeVisible();
    const rows = within(
      screen.getByRole('table', { name: 'Métricas por sesión' }),
    )
      .getAllByRole('row')
      .slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      '175 %7 / 10',
      '283,33 %6,67 / 10',
      '391,67 %8,33 / 10',
      '483,33 %7,67 / 10',
    ]);
  });

  it('mantiene visibles los ceros y declara sesiones sin esfuerzo y criterios faltantes', () => {
    render(
      <AdjustmentEvidence
        type="CARGA"
        criterion="SOBREEXIGENCIA"
        supportingData={{
          metrics: {
            sesionesConsideradas: 2,
            variacionCargaMaxima: null,
            cumplimientoRepeticionesPorSesion: [0, 50],
            esfuerzoMedioPorSesion: [null],
            criteriosNoEvaluados: [
              'esfuerzo_percibido_no_registrado',
              'variacion_carga_maxima_no_calculable',
            ],
          },
        }}
      />,
    );
    expect(screen.getByText('0 %')).toBeVisible();
    expect(screen.getByText('25 %')).toBeVisible();
    expect(screen.getByText('Sin datos comparables')).toBeVisible();
    expect(screen.getByText('Esfuerzo percibido sin registrar')).toBeVisible();
    expect(
      screen.getByText('Variación de carga máxima estimada no calculable'),
    ).toBeVisible();
    const rows = within(
      screen.getByRole('table', { name: 'Métricas por sesión' }),
    )
      .getAllByRole('row')
      .slice(1);
    expect(rows.every((row) => within(row).getByText('Sin registrar'))).toBe(
      true,
    );
  });
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
