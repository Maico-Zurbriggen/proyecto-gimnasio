import { fireEvent, screen, within } from '@testing-library/react';
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
        criterion:
          'Estancamiento: variación de carga máxima estimada +0,8% < +2,5% (RN-79a).',
        previousValue: { carga_sugerida: 60 },
        proposedValue: { carga_sugerida: 62.5 },
        supportingData: {
          sesionesConsideradas: 6,
          variacionE1RM: 0.8,
        },
        state: 'PENDIENTE',
      },
      {
        id: ADJ_SCHEME,
        type: 'ESQUEMA',
        routineExerciseId: 're-2',
        exerciseName: 'Press de banca plano',
        criterion:
          'Estímulo insuficiente: tope del rango en las últimas 2 sesiones con esfuerzo ≤ 5 (RN-79a).',
        previousValue: { min_repetitions: 3, max_repetitions: 6 },
        proposedValue: { min_repetitions: 4, max_repetitions: 6 },
        supportingData: {
          sesionesConsideradas: 4,
          cumplimientoTopes: true,
        },
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
  it('lets the trainer request regeneration with feedback and disables approval while pending', async () => {
    const candidateRequestId = '70000000-0000-4000-8000-000000000001';
    let input: Record<string, unknown> | undefined;
    mockApi({
      [`GET /proposals/${PROPOSAL}`]: {
        body: review({ regeneration: { candidateRequestId } }),
      },
      [`GET /proposals/${PROPOSAL}/regeneration`]: { body: null },
      [`POST /proposals/${PROPOSAL}/regeneration`]: (init) => {
        input = JSON.parse(String(init?.body));
        return {
          status: 202,
          body: {
            id: 'regen',
            trainerId: 'trainer',
            proposalId: PROPOSAL,
            candidateRequestId,
            feedback: 'Más variedad de ejercicios',
            requestId: 'request',
            state: 'PENDIENTE',
            error: null,
          },
        };
      },
    });
    renderPage();
    const textarea = await screen.findByLabelText(
      'Qué debería mejorar la nueva planilla',
    );
    const button = screen.getByRole('button', {
      name: 'Regenerar planilla con IA',
    });
    expect(button).toBeDisabled();
    fireEvent.change(textarea, {
      target: { value: 'Más variedad de ejercicios' },
    });
    fireEvent.click(button);
    expect(
      await screen.findByText(/La IA está generando otra planilla/),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeDisabled();
    expect(input).toMatchObject({
      feedback: 'Más variedad de ejercicios',
      candidateRequestId,
    });
    expect(typeof input?.idempotencyKey).toBe('string');
  });

  it('restores a failed regeneration after reload and keeps the previous proposal available', async () => {
    const candidateRequestId = '70000000-0000-4000-8000-000000000001';
    mockApi({
      [`GET /proposals/${PROPOSAL}`]: {
        body: review({ regeneration: { candidateRequestId } }),
      },
      [`GET /proposals/${PROPOSAL}/regeneration`]: {
        body: {
          id: 'regen',
          trainerId: 'trainer',
          proposalId: PROPOSAL,
          candidateRequestId,
          feedback: 'Cambiar',
          requestId: 'request',
          state: 'NO_DISPONIBLE',
          error: 'IA caída.',
        },
      },
    });
    renderPage();
    expect(await screen.findByText(/No se pudo regenerar:/)).toHaveTextContent(
      'planilla anterior sigue disponible',
    );
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeEnabled();
  });

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
    // T3 (RF-090, FL-10): cada ajuste muestra su criterio y el dato que lo sustenta.
    expect(
      screen.getByText(/variación de carga máxima estimada/i),
    ).toBeVisible();
    expect(
      screen.getAllByText(/Sesiones consideradas:/).length,
    ).toBeGreaterThan(0);
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

  it('shows the automatic structure as a readable plan and derives the before/after from captured evidence', async () => {
    const sets = [
      {
        position: 1,
        minRepetitions: 8,
        maxRepetitions: 12,
        suggestedLoad: 10.5,
        restSeconds: 90,
        warmup: false,
      },
    ];
    const body = review({
      adjustments: [
        {
          id: ADJ_LOAD,
          type: 'ESTRUCTURA',
          routineExerciseId: null,
          exerciseName: null,
          criterion: 'Renovación automática por ciclo cumplido.',
          previousValue: { routine_type: 'FUERZA', target_weekly_frequency: 2 },
          proposedValue: {
            routineType: 'FUERZA',
            targetWeeklyFrequency: 2,
            days: [
              {
                position: 1,
                name: 'Día A',
                dominantPattern: 'CORE',
                exercises: [
                  {
                    position: 1,
                    exerciseId: 'plancha',
                    exerciseName: 'Plancha abdominal',
                    movementPattern: 'CORE',
                    note: null,
                    sets,
                  },
                ],
              },
              {
                position: 2,
                name: 'Día B',
                dominantPattern: 'AISLAMIENTO_SUPERIOR',
                exercises: [
                  {
                    position: 1,
                    exerciseId: 'curl',
                    exerciseName: 'Curl de bíceps',
                    movementPattern: 'AISLAMIENTO_SUPERIOR',
                    note: null,
                    sets,
                  },
                ],
              },
            ],
          },
          supportingData: {
            estructuraVigente: {
              days: [
                {
                  position: 1,
                  name: 'Día A',
                  exercises: [{ exerciseId: 'curl' }],
                },
                {
                  position: 2,
                  name: 'Día B',
                  exercises: [{ exerciseId: 'plancha' }],
                },
              ],
            },
            mediciones: [
              { type: 'PESO_CORPORAL', value: 73, measuredOn: '2026-09-01' },
            ],
          },
          state: 'PENDIENTE',
        },
      ],
    });
    const fetchMock = mockApi({ [`GET /proposals/${PROPOSAL}`]: { body } });
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Planilla propuesta por IA' }),
    ).toBeVisible();
    expect(
      screen.getAllByText('Serie 1: 8-12 rep · 10.5 kg · 90s de descanso'),
    ).toHaveLength(2);
    const table = screen.getByRole('table', {
      name: 'Distribución vigente y propuesta',
    });
    const row = within(table).getByText('Curl de bíceps').closest('tr')!;
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['Curl de bíceps', 'Día A', 'Día B']);
    expect(screen.getByText(/Peso corporal: 73/)).toBeVisible();
    expect(screen.queryByText(/"exerciseId"/)).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(false);
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
