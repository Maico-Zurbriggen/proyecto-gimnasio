import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { RoutineChangeRequestPanel } from './RoutineChangeRequestPanel';

const STUDENT_ID = '20000000-0000-4000-8000-000000000005';
const REQUEST_ID = '50000000-0000-4000-8000-000000000001';
const ROUTINE_ID = '60000000-0000-4000-8000-000000000002';

function renderPanel(onApplied?: (routineId: string) => void) {
  return renderRoute(
    '/alumno',
    '/alumno',
    <RoutineChangeRequestPanel studentId={STUDENT_ID} onApplied={onApplied} />,
  );
}

describe('RoutineChangeRequestPanel', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envía los cambios, finaliza la generación y avisa la rutina nueva', async () => {
    const onApplied = vi.fn();
    const fetchMock = mockApi({
      [`POST /students/${STUDENT_ID}/routine-generations`]: {
        status: 202,
        body: { requestId: REQUEST_ID, status: 'pending' },
      },
      [`GET /students/${STUDENT_ID}/routine-generations/${REQUEST_ID}`]: {
        body: {
          requestId: REQUEST_ID,
          status: 'COMPLETADA',
          estructuraCandidata: { dias: [] },
          violaciones: null,
          error: null,
          routineId: null,
        },
      },
      [`POST /students/${STUDENT_ID}/routine-generations/${REQUEST_ID}/finalize`]:
        { status: 201, body: { routineId: ROUTINE_ID, status: 'PROPUESTA' } },
    });
    renderPanel(onApplied);

    fireEvent.change(screen.getByLabelText('Cambios'), {
      target: { value: 'Sumá un día de piernas' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pedir cambios' }));

    await waitFor(() => {
      expect(onApplied).toHaveBeenCalledWith(ROUTINE_ID);
    });
    const post = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith('/routine-generations') && init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
      cambios: 'Sumá un día de piernas',
    });
  });

  it('informa que ya no hay rutina propuesta', async () => {
    mockApi({
      [`POST /students/${STUDENT_ID}/routine-generations`]: {
        status: 409,
        body: { error: 'no_proposed_routine' },
      },
    });
    renderPanel();
    fireEvent.change(screen.getByLabelText('Cambios'), {
      target: { value: 'Más pecho' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pedir cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya no hay una rutina propuesta',
    );
  });
});
