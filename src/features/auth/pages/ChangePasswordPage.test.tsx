import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { ChangePasswordPage } from './ChangePasswordPage';

const RUTA = '/cuenta/contrasena';

describe('ChangePasswordPage (HU09 - RF-003)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('cambia la contraseña propia y avisa que la sesión sigue abierta', async () => {
    const fetchMock = mockApi({
      'POST /auth/password-change': { status: 204, body: null },
    });
    renderRoute(RUTA, RUTA, <ChangePasswordPage />);

    fireEvent.change(screen.getByLabelText(/Contraseña nueva/), {
      target: { value: 'Nueva2026' },
    });
    fireEvent.change(screen.getByLabelText(/Repetí la contraseña/), {
      target: { value: 'Nueva2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText('Contraseña actualizada')).toBeVisible();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    // Sólo la propia: el cuerpo no identifica a ningún usuario.
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      password: 'Nueva2026',
    });
  });

  it('no envía una contraseña que no cumple los requisitos', () => {
    const fetchMock = mockApi({});
    renderRoute(RUTA, RUTA, <ChangePasswordPage />);

    fireEvent.change(screen.getByLabelText(/Contraseña nueva/), {
      target: { value: 'corta' },
    });
    fireEvent.change(screen.getByLabelText(/Repetí la contraseña/), {
      target: { value: 'corta' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(
      screen.getByText('La contraseña todavía no cumple todos los requisitos.'),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
