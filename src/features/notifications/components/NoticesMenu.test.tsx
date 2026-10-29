import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { NoticesMenu } from './NoticesMenu';

const NOTICE_ID = '10000000-0000-4000-8000-000000000001';

describe('NoticesMenu', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('removes an unread notice after marking it as read', async () => {
    let read = false;
    mockApi({
      'GET /notices': () => ({
        body: {
          items: read
            ? []
            : [
                {
                  id: NOTICE_ID,
                  audienceRole: 'ENTRENADOR',
                  type: 'INCOMPATIBILIDAD_SOBREVENIDA',
                  referenceType: 'ADAPTATION_PROPOSAL',
                  referenceId: '20000000-0000-4000-8000-000000000001',
                  text: 'La rutina requiere revisión.',
                  createdAt: '2026-10-29T12:00:00.000Z',
                  readAt: null,
                },
              ],
          unreadCount: read ? 0 : 1,
        },
      }),
      [`PATCH /notices/${NOTICE_ID}/read`]: () => {
        read = true;
        return {
          body: {
            id: NOTICE_ID,
            audienceRole: 'ENTRENADOR',
            type: 'INCOMPATIBILIDAD_SOBREVENIDA',
            referenceType: 'ADAPTATION_PROPOSAL',
            referenceId: '20000000-0000-4000-8000-000000000001',
            text: 'La rutina requiere revisión.',
            createdAt: '2026-10-29T12:00:00.000Z',
            readAt: '2026-10-29T12:01:00.000Z',
          },
        };
      },
    });
    renderRoute('/', '/', <NoticesMenu role="entrenador" />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Notificaciones, 1 sin leer',
      }),
    );
    expect(screen.getByText('La rutina requiere revisión.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como leída' }));

    await waitFor(() => {
      expect(
        screen.queryByText('La rutina requiere revisión.'),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByText('No tenés notificaciones pendientes.'),
    ).toBeVisible();
  });
});
