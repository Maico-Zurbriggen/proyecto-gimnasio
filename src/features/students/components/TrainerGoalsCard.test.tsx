import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { TrainerGoalsCard } from './TrainerGoalsCard';

const STUDENT = '11000000-0000-4000-8000-000000000001';

describe('TrainerGoalsCard (HU10)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra al entrenador el objetivo vigente y el historial', async () => {
    mockApi({
      [`GET /students/${STUDENT}/goals`]: {
        body: {
          timezone: 'America/Argentina/Buenos_Aires',
          current: {
            id: '12000000-0000-4000-8000-000000000002',
            type: 'RESISTENCIA_MUSCULAR',
            startsOn: '2026-10-20T12:00:00.000Z',
            endsOn: null,
          },
          history: [
            {
              id: '12000000-0000-4000-8000-000000000001',
              type: 'HIPERTROFIA',
              startsOn: '2026-10-01T12:00:00.000Z',
              endsOn: '2026-10-20T12:00:00.000Z',
            },
            {
              id: '12000000-0000-4000-8000-000000000002',
              type: 'RESISTENCIA_MUSCULAR',
              startsOn: '2026-10-20T12:00:00.000Z',
              endsOn: null,
            },
          ],
          atDate: null,
          context: { sufficient: true, missing: [] },
        },
      },
    });

    renderRoute(
      `/entrenador/alumnos/:studentId`,
      `/entrenador/alumnos/${STUDENT}`,
      <TrainerGoalsCard studentId={STUDENT} />,
    );

    expect(
      (await screen.findAllByText('Resistencia muscular'))[0],
    ).toBeVisible();
    expect(screen.getByText('Ver historial (2)')).toBeVisible();
  });
});
