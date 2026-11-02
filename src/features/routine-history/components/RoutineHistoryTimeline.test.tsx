import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { RoutineHistoryTimeline } from './RoutineHistoryTimeline';

const STUDENT_ID = '20000000-0000-4000-8000-000000000005';

const generation = (kind: string) => ({
  requestId: '50000000-0000-4000-8000-000000000001',
  kind,
  freeText: null,
  parameters: null,
  changeRequest: null,
  trainerFeedback: null,
  explanation: null,
  attempts: 1,
  modelVersion: 'm-1',
  requestedAt: '2026-10-01T10:00:00.000Z',
  finishedAt: '2026-10-01T10:01:00.000Z',
});

const ana = { id: 'u1', name: 'Ana Alumna' };
const tomas = { id: 'u2', name: 'Tomás Profe' };

const items = [
  {
    routineId: 'r2',
    state: 'VIGENTE',
    origin: 'GENERADA',
    routineType: 'HIPERTROFIA',
    targetWeeklyFrequency: 4,
    requestedAt: '2026-10-02T10:00:00.000Z',
    requestedBy: ana,
    replacesRoutineId: 'r1',
    replacedByRoutineId: null,
    versionCount: 1,
    generation: generation('CHANGE_REQUEST'),
    events: [
      {
        type: 'CAMBIO_SOLICITADO',
        at: '2026-10-02T10:00:00.000Z',
        actor: ana,
        detail: 'Más pecho',
      },
      {
        type: 'REVISION_ENTRENADOR',
        at: '2026-10-03T10:00:00.000Z',
        actor: tomas,
        detail: 'Bajé el volumen de piernas',
        data: { label: 'Aprobó la rutina con cambios' },
      },
    ],
  },
  {
    routineId: 'r1',
    state: 'DESCARTADA',
    origin: 'GENERADA',
    routineType: 'FUERZA',
    targetWeeklyFrequency: 3,
    requestedAt: '2026-10-01T10:00:00.000Z',
    requestedBy: ana,
    replacesRoutineId: null,
    replacedByRoutineId: 'r2',
    versionCount: 1,
    generation: generation('INITIAL'),
    events: [
      {
        type: 'GENERACION_SOLICITADA',
        at: '2026-10-01T10:00:00.000Z',
        actor: ana,
        detail: 'Quiero ganar fuerza',
      },
    ],
  },
];

describe('RoutineHistoryTimeline', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra cada rutina con el pedido, el cambio y la decisión del entrenador', async () => {
    mockApi({
      [`GET /students/${STUDENT_ID}/routine-history`]: { body: { items } },
    });
    renderRoute(
      '/alumno',
      '/alumno',
      <RoutineHistoryTimeline studentId={STUDENT_ID} />,
    );

    expect(await screen.findByText('Más pecho')).toBeInTheDocument();
    expect(
      screen.getByText('Aprobó la rutina con cambios'),
    ).toBeInTheDocument();
    expect(screen.getByText('Bajé el volumen de piernas')).toBeInTheDocument();
    expect(screen.getByText('Vigente')).toBeInTheDocument();
    expect(screen.getByText('Descartada')).toBeInTheDocument();
    // La rutina anterior está colapsada hasta que se abre.
    expect(screen.queryByText('Quiero ganar fuerza')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Fuerza/ }));
    expect(screen.getByText('Quiero ganar fuerza')).toBeInTheDocument();
  });

  it('avisa cuando todavía no hay rutinas', async () => {
    mockApi({
      [`GET /students/${STUDENT_ID}/routine-history`]: { body: { items: [] } },
    });
    renderRoute(
      '/alumno',
      '/alumno',
      <RoutineHistoryTimeline studentId={STUDENT_ID} />,
    );
    expect(
      await screen.findByText('Todavía no hay rutinas en el historial.'),
    ).toBeInTheDocument();
  });
});
