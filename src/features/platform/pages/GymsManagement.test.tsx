import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { GymsPage } from './GymsPage';

const GYM = {
  id: '10000000-0000-4000-8000-000000000099',
  name: 'Gimnasio Norte',
  timezone: 'America/Argentina/Cordoba',
  status: 'ACTIVO',
  createdAt: '2026-10-12T12:00:00.000Z',
  administratorCount: 1,
  bootstrapInvitation: null,
};

describe('GymsPage - edición y suspensión (HU13 criterios 22 y 23)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('pide confirmar el cambio de zona horaria cuando ya hay sesiones', async () => {
    let intentos = 0;
    const fetchMock = mockApi({
      'GET /platform/gyms': { body: [GYM] },
      'GET /platform/timezones': {
        body: ['America/Argentina/Buenos_Aires', 'America/Argentina/Cordoba'],
      },
      [`PATCH /platform/gyms/${GYM.id}`]: () => {
        intentos += 1;
        return intentos === 1
          ? {
              status: 409,
              body: {
                error: 'timezone_change_requires_confirmation',
                message: 'El gimnasio tiene 12 sesiones registradas.',
                sessionCount: 12,
              },
            }
          : {
              body: { ...GYM, timezone: 'America/Argentina/Buenos_Aires' },
            };
      },
    });
    renderRoute('/superadmin', '/superadmin', <GymsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    await screen.findByRole('option', {
      name: 'America/Argentina/Buenos_Aires',
    });
    fireEvent.change(screen.getByLabelText('Zona horaria'), {
      target: { value: 'America/Argentina/Buenos_Aires' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('El gimnasio tiene 12 sesiones registradas.'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText(
        'Entiendo el impacto y quiero cambiar la zona horaria.',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      const patches = fetchMock.mock.calls.filter(
        ([, init]) => init?.method === 'PATCH',
      );
      expect(JSON.parse(String(patches[1]?.[1]?.body))).toEqual({
        zonaHoraria: 'America/Argentina/Buenos_Aires',
        confirmarCambioDeZona: true,
      });
    });
  });

  it('suspende con una confirmación explícita', async () => {
    const fetchMock = mockApi({
      'GET /platform/gyms': { body: [GYM] },
      [`POST /platform/gyms/${GYM.id}/status`]: {
        body: { ...GYM, status: 'INACTIVO' },
      },
    });
    renderRoute('/superadmin', '/superadmin', <GymsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Suspender' }));
    expect(
      screen.getByText(/Sus usuarios no van a poder ingresar/),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar suspensión' }),
    );

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith('/status'),
      );
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({ activo: false });
    });
  });
});
