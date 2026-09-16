import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { ProposalReviewPage } from './ProposalReviewPage';

const PROPOSAL = '66000000-0000-4000-8000-000000000005';
const ADJ_LOAD = '67000000-0000-4000-8000-000000000051';
const ADJ_SCHEME = '67000000-0000-4000-8000-000000000052';

function review(overrides: Record<string, unknown> = {}) {
  return {
    id: PROPOSAL,
    state: 'PENDIENTE',
    createdAt: '2026-09-14T12:00:00.000Z',
    resolvedAt: null,
    resolutionReason: null,
    student: {
      id: '20000000-0000-4000-8000-000000000005',
      displayName: 'Sofía Medina',
    },
    routine: { id: 'r', routineType: 'FUERZA', currentVersionNumber: 1 },
    diagnostic: {
      periodStart: '2026-08-26',
      periodEnd: '2026-09-14',
      globalSituation: 'ESTANCAMIENTO',
      adherence: 62.5,
    },
    adjustments: [
      {
        id: ADJ_LOAD,
        type: 'CARGA',
        routineExerciseId: 're-1',
        exerciseName: 'Sentadilla con barra',
        criterion: 'Estancamiento de la carga máxima estimada.',
        previousValue: { carga_sugerida: 60 },
        proposedValue: { carga_sugerida: 62.5 },
        supportingData: {},
        state: 'PENDIENTE',
      },
      {
        id: ADJ_SCHEME,
        type: 'ESQUEMA',
        routineExerciseId: 're-2',
        exerciseName: 'Press de banca plano',
        criterion: 'Cumplimiento en el tope del rango.',
        previousValue: { min_repetitions: 3, max_repetitions: 6 },
        proposedValue: { min_repetitions: 4, max_repetitions: 6 },
        supportingData: {},
        state: 'PENDIENTE',
      },
    ],
    advertenciaDatos: {
      sinDatosActualizados: true,
      datoFaltante: 'medicion corporal posterior al inicio del ciclo',
      faltasConsecutivas: 1,
      alcanzoTopeDeFaltas: false,
    },
    ...overrides,
  };
}

function renderPage() {
  return renderRoute(
    '/entrenador/rutinas/revisar/:proposalId',
    `/entrenador/rutinas/revisar/${PROPOSAL}`,
    <ProposalReviewPage />,
  );
}

describe('ProposalReviewPage (HU04)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Esc. 2: muestra la advertencia y los ajustes antes de decidir', async () => {
    mockApi({ [`GET /proposals/${PROPOSAL}`]: { body: review() } });

    renderPage();

    expect(
      await screen.findByText('Propuesta generada sin datos actualizados'),
    ).toBeVisible();
    expect(screen.getByText('Carga · Sentadilla con barra')).toBeVisible();
    expect(screen.getByText('62,5 kg')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Aprobar parcialmente' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeDisabled();
  });

  it('Esc. 1: sin advertencia cuando la propuesta tiene datos actualizados', async () => {
    mockApi({
      [`GET /proposals/${PROPOSAL}`]: {
        body: review({
          advertenciaDatos: {
            sinDatosActualizados: false,
            faltasConsecutivas: 0,
            alcanzoTopeDeFaltas: false,
          },
        }),
      },
    });

    renderPage();

    expect(
      await screen.findByText('Carga · Sentadilla con barra'),
    ).toBeVisible();
    expect(
      screen.queryByText('Propuesta generada sin datos actualizados'),
    ).not.toBeInTheDocument();
  });

  it('Esc. 3: aprobar parcialmente envía sólo los ajustes marcados', async () => {
    const fetchMock = mockApi({
      [`GET /proposals/${PROPOSAL}`]: { body: review() },
      [`POST /proposals/${PROPOSAL}/resolution`]: {
        body: {
          proposalId: PROPOSAL,
          state: 'ACEPTADA_PARCIAL',
          resultingVersionNumber: 2,
        },
      },
    });

    renderPage();

    fireEvent.click(
      await screen.findByRole('checkbox', {
        name: 'Aceptar Carga · Sentadilla con barra',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Aprobar parcialmente' }),
    );

    expect(
      await screen.findByText(
        'Propuesta aprobada: se creó la versión 2 de la rutina.',
      ),
    ).toBeVisible();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      decision: 'ACEPTADA_PARCIAL',
      acceptedAdjustmentIds: [ADJ_LOAD],
    });
  });

  it('Esc. 4: rechazar exige motivo y lo envía', async () => {
    const fetchMock = mockApi({
      [`GET /proposals/${PROPOSAL}`]: { body: review() },
      [`POST /proposals/${PROPOSAL}/resolution`]: {
        body: {
          proposalId: PROPOSAL,
          state: 'RECHAZADA',
          resultingVersionNumber: null,
        },
      },
    });

    renderPage();

    const reject = await screen.findByRole('button', { name: 'Rechazar' });
    expect(reject).toBeDisabled();

    fireEvent.change(
      screen.getByLabelText('Motivo (obligatorio para rechazar)'),
      {
        target: { value: 'Dolor de rodilla reportado' },
      },
    );
    fireEvent.click(reject);

    expect(
      await screen.findByText(
        'Propuesta rechazada. El motivo quedó registrado.',
      ),
    ).toBeVisible();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      decision: 'RECHAZADA',
      reason: 'Dolor de rodilla reportado',
    });
  });

  it('muestra el error del backend si la propuesta ya fue resuelta', async () => {
    mockApi({
      [`GET /proposals/${PROPOSAL}`]: { body: review() },
      [`POST /proposals/${PROPOSAL}/resolution`]: {
        status: 409,
        body: { error: 'proposal_not_pending' },
      },
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));

    expect(
      await screen.findByText('La propuesta ya fue resuelta.'),
    ).toBeVisible();
  });
});
