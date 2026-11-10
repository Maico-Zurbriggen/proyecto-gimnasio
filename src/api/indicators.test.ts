import { describe, expect, it, vi } from 'vitest';

import * as client from './client';
import {
  fetchAdherence,
  fetchMuscleActivity,
  fetchSessionCompliance,
  fetchSignals,
} from './indicators';

describe('indicators API client', () => {
  it('parses successful adherence response', async () => {
    vi.spyOn(client, 'apiGet').mockResolvedValueOnce({
      studentId: 'std-1',
      adherencia: {
        disponible: true,
        porcentaje: 75,
        sesionesCompletadas: 3,
        sesionesEsperadas: 4,
      },
      calculadoEl: '2026-11-09T12:00:00Z',
    });

    const res = await fetchAdherence('std-1');
    expect(res.adherencia.disponible).toBe(true);
    if (res.adherencia.disponible) {
      expect(res.adherencia.porcentaje).toBe(75);
      expect(res.adherencia.sesionesCompletadas).toBe(3);
    }
  });

  it('parses insufficient data adherence response', async () => {
    vi.spyOn(client, 'apiGet').mockResolvedValueOnce({
      studentId: 'std-1',
      adherencia: {
        disponible: false,
        status: 'SIN_DATOS_SUFICIENTES',
        missing: 'historial de rutina vigente',
        unit: 'semanas',
        required: 2,
        available: 0,
        remaining: 2,
        action: 'Esperá a completar al menos dos semanas.',
      },
      calculadoEl: '2026-11-09T12:00:00Z',
    });

    const res = await fetchAdherence('std-1');
    expect(res.adherencia.disponible).toBe(false);
    if (!res.adherencia.disponible) {
      expect(res.adherencia.status).toBe('SIN_DATOS_SUFICIENTES');
      expect(res.adherencia.remaining).toBe(2);
    }
  });

  it('parses session compliance response', async () => {
    vi.spyOn(client, 'apiGet').mockResolvedValueOnce({
      sessionId: 'ses-1',
      cumplimientoDeSeries: {
        disponible: true,
        porcentaje: 100,
        numerador: 4,
        denominador: 4,
      },
      cumplimientoDeRepeticiones: {
        disponible: true,
        porcentaje: 90,
        numerador: 36,
        denominador: 40,
      },
      calculadoEl: '2026-11-09T12:00:00Z',
    });

    const res = await fetchSessionCompliance('std-1', 'ses-1');
    expect(res.cumplimientoDeSeries.disponible).toBe(true);
    expect(res.cumplimientoDeRepeticiones.disponible).toBe(true);
  });

  it('parses muscle activity response with volume and frequency', async () => {
    vi.spyOn(client, 'apiGet').mockResolvedValueOnce({
      studentId: 'std-1',
      from: '2026-10-12',
      to: '2026-11-09',
      timezone: 'America/Argentina/Buenos_Aires',
      sessionCount: 8,
      insufficientData: null,
      unclassifiedSets: 0,
      unit: 'SERIES_EFECTIVAS',
      groups: [
        {
          group: 'PECTORAL',
          status: 'CALCULADO',
          volume: 12.5,
          frequency: 4,
        },
        {
          group: 'DORSAL',
          status: 'CALCULADO',
          volume: 10,
          frequency: 3,
        },
      ],
      exerciseVolumes: [
        {
          exerciseId: 'ex-1',
          completedWorkSets: 10,
          unit: 'SERIES_DE_TRABAJO',
          classification: 'CLASIFICADO',
        },
      ],
      calculatedAt: '2026-11-09T12:00:00Z',
    });

    const res = await fetchMuscleActivity('std-1', {
      from: '2026-10-12',
      to: '2026-11-09',
    });
    expect(res.sessionCount).toBe(8);
    expect(res.groups).toHaveLength(2);
    expect(res.groups[0]!.volume).toBe(12.5);
    expect(res.groups[0]!.frequency).toBe(4);
  });

  it('parses signals response with stagnation, adherence drop and imbalance', async () => {
    vi.spyOn(client, 'apiGet').mockResolvedValueOnce({
      studentId: 'std-1',
      estancamiento: [
        {
          sobre: 'ex-press',
          estado: 'DETECTADA',
          detalle: {
            exerciseId: 'ex-press',
            variacionPorcentual: 0,
            sesionesConsideradas: 4,
          },
        },
      ],
      caidaDeAdherencia: {
        estado: 'DETECTADA',
        detalle: {
          adherenciaPrevia: 100,
          adherenciaReciente: 25,
          caidaEnPuntos: 75,
        },
      },
      desbalance: {
        estado: 'DETECTADA',
        detalle: [
          {
            grupo: 'PECTORAL',
            seriesSemanales: 2,
            tipo: 'POR_DEFECTO',
          },
        ],
      },
      seriesSinClasificar: 0,
      calculadoEl: '2026-11-09T12:00:00Z',
    });

    const res = await fetchSignals('std-1');
    expect(res.estancamiento[0]!.estado).toBe('DETECTADA');
    expect(res.caidaDeAdherencia.estado).toBe('DETECTADA');
    expect(res.desbalance.estado).toBe('DETECTADA');
  });
});
