import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { TrainerConditionsCard } from './TrainerConditionsCard';

const ALUMNO = '11000000-0000-4000-8000-000000000001';
const BASE = `/students/${ALUMNO}/conditions`;

function renderCard() {
  return renderRoute(
    '/entrenador/alumnos/:studentId',
    `/entrenador/alumnos/${ALUMNO}`,
    <TrainerConditionsCard studentId={ALUMNO} />,
  );
}

describe('TrainerConditionsCard (HU11 - criterio front 12)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra las condiciones en solo lectura', async () => {
    mockApi({
      [`GET ${BASE}/status`]: {
        body: {
          healthDataConsent: true,
          declaredNone: false,
          declaredNoneAt: null,
          activeCount: 1,
        },
      },
      [`GET ${BASE}`]: {
        body: [
          {
            id: '51000000-0000-4000-8000-000000000001',
            studentId: ALUMNO,
            bodyZoneCode: 'COLUMNA_LUMBAR',
            severity: 'SEVERA',
            description: null,
            startsOn: '2026-10-01',
            endsOn: null,
            vigente: true,
          },
        ],
      },
    });
    renderCard();

    expect(await screen.findByText('Columna lumbar')).toBeVisible();
    expect(screen.getByText('Severidad: Severa')).toBeVisible();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('form')).toBeNull();
  });

  it('avisa cuando el alumno no dio el consentimiento', async () => {
    mockApi({
      [`GET ${BASE}/status`]: {
        body: {
          healthDataConsent: false,
          declaredNone: false,
          declaredNoneAt: null,
          activeCount: 0,
        },
      },
    });
    renderCard();

    expect(
      await screen.findByText(/todavía no dio su consentimiento/),
    ).toBeVisible();
  });

  it('distingue si declaró no tener ninguna', async () => {
    mockApi({
      [`GET ${BASE}/status`]: {
        body: {
          healthDataConsent: true,
          declaredNone: true,
          declaredNoneAt: '2026-10-10T12:00:00.000Z',
          activeCount: 0,
        },
      },
      [`GET ${BASE}`]: { body: [] },
    });
    renderCard();

    expect(
      await screen.findByText(/Declaró no tener ninguna condición física/),
    ).toBeVisible();
  });
});
