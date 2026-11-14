import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { EvolutionDiagnosticCard } from './EvolutionDiagnosticCard';

const STUDENT_ID = '21000000-0000-4000-8000-000000000004';
const PATH = `/students/${STUDENT_ID}/evolution-diagnostic`;

const diagnostic = {
  disponible: true,
  diagnosticId: '61000000-0000-4000-8000-000000000001',
  studentId: STUDENT_ID,
  routineVersionId: '62000000-0000-4000-8000-000000000001',
  periodStart: '2026-10-02',
  periodEnd: '2026-11-13',
  globalSituation: 'ESTANCAMIENTO',
  adherencia: 75,
  criteriosNoEvaluados: ['esfuerzo_percibido_no_registrado'],
  componentVersion: 'evolution-diagnosis@1',
  calculadoEl: '2026-11-13T03:30:00.000Z',
  ejercicios: [
    {
      exerciseId: '10000000-0000-4000-8000-000000000001',
      exerciseName: 'Press de banca',
      situation: 'ESTANCAMIENTO',
      metrics: { sesionesConsideradas: 4 },
    },
  ],
};

function renderCard(allowRecalculate = false) {
  return renderRoute(
    '/',
    '/',
    <EvolutionDiagnosticCard
      studentId={STUDENT_ID}
      allowRecalculate={allowRecalculate}
    />,
  );
}

describe('EvolutionDiagnosticCard (HU32)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra al alumno el diagnóstico y sus ejercicios sin acción de recálculo', async () => {
    mockApi({ [`GET ${PATH}`]: { body: diagnostic } });

    renderCard();

    expect(
      await screen.findByRole('heading', { name: 'Estancamiento' }),
    ).toBeVisible();
    expect(screen.getByText('Press de banca')).toBeVisible();
    expect(screen.getByText(/adherencia 75/)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /recalcular ahora/i }),
    ).not.toBeInTheDocument();
  });

  it('declara la ausencia de cálculo sin degradar la vista', async () => {
    mockApi({
      [`GET ${PATH}`]: {
        body: {
          studentId: STUDENT_ID,
          disponible: false,
          motivo: 'SIN_DIAGNOSTICO_CALCULADO',
        },
      },
    });

    renderCard();

    expect(
      await screen.findByText('Todavía no hay un diagnóstico calculado'),
    ).toBeVisible();
  });

  it('permite al entrenador asignado recalcular y refresca la consulta', async () => {
    const fetchMock = mockApi({
      [`GET ${PATH}`]: { body: diagnostic },
      [`POST ${PATH}`]: {
        status: 201,
        body: {
          diagnosticId: '61000000-0000-4000-8000-000000000002',
          globalSituation: 'PROGRESION_ADECUADA',
          exerciseCount: 1,
        },
      },
    });

    renderCard(true);
    fireEvent.click(
      await screen.findByRole('button', { name: /recalcular ahora/i }),
    );

    expect(
      await screen.findByText('Diagnóstico recalculado correctamente.'),
    ).toBeVisible();
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(
          ([input, init]) =>
            (init as RequestInit | undefined)?.method === 'POST' &&
            new URL(input as string).pathname === PATH,
        ),
      ).toHaveLength(1);
      expect(
        fetchMock.mock.calls.filter(
          ([input, init]) =>
            ((init as RequestInit | undefined)?.method ?? 'GET') === 'GET' &&
            new URL(input as string).pathname === PATH,
        ).length,
      ).toBeGreaterThanOrEqual(2);
    });
  });
});
