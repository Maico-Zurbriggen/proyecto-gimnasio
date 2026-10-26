import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { StudentGoalsPanel } from './StudentGoalsPanel';

const STUDENT = '11000000-0000-4000-8000-000000000001';
const URL = `/students/${STUDENT}/goals`;
const GOAL = {
  id: '12000000-0000-4000-8000-000000000001',
  type: 'FUERZA',
  startsOn: '2026-10-01T12:00:00.000Z',
  endsOn: null,
};

function snapshot(
  current: typeof GOAL | null,
  history = current ? [current] : [],
) {
  return {
    timezone: 'America/Argentina/Buenos_Aires',
    current,
    history,
    atDate: null,
    context: {
      sufficient: current !== null,
      missing: current ? [] : ['objetivo'],
    },
  };
}

function renderPanel() {
  return renderRoute(
    '/alumno/perfil',
    '/alumno/perfil',
    <StudentGoalsPanel studentId={STUDENT} />,
  );
}

describe('StudentGoalsPanel (HU10)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra el objetivo vigente y su fecha de inicio', async () => {
    mockApi({ [`GET ${URL}`]: { body: snapshot(GOAL) } });
    renderPanel();

    expect((await screen.findAllByText('Fuerza'))[0]).toBeVisible();
    expect(screen.getByText(/Desde/)).toBeVisible();
  });

  it('permite declarar el primer objetivo y actualiza la vista', async () => {
    let current: typeof GOAL | null = null;
    const fetchMock = mockApi({
      [`GET ${URL}`]: () => ({ body: snapshot(current) }),
      [`POST ${URL}`]: () => {
        current = GOAL;
        return { status: 201, body: { goal: GOAL, changed: true } };
      },
    });
    renderPanel();

    expect(await screen.findByText('Sin declarar')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Declarar objetivo'), {
      target: { value: 'FUERZA' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar objetivo' }));

    expect(await screen.findByText('Fuerza')).toBeVisible();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => init?.method === 'POST' && String(url).endsWith(URL),
      ),
    ).toBe(true);
  });

  it('ofrece reintentar cuando falla la consulta', async () => {
    mockApi({ [`GET ${URL}`]: { status: 500, body: { error: 'internal' } } });
    renderPanel();

    expect(
      await screen.findByText('No pudimos cargar tu objetivo.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});
