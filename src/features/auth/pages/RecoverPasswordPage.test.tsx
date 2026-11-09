import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { RecoverPasswordPage } from './RecoverPasswordPage';

const RUTA = '/recuperar-contrasena';

function escribirContrasenas(nueva: string, repeticion = nueva) {
  fireEvent.change(screen.getByLabelText(/Contraseña nueva/), {
    target: { value: nueva },
  });
  fireEvent.change(screen.getByLabelText(/Repetí la contraseña/), {
    target: { value: repeticion },
  });
}

describe('RecoverPasswordPage (HU09)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('pide el enlace y muestra siempre el mismo mensaje', async () => {
    const fetchMock = mockApi({
      'POST /auth/password-recovery': { status: 202, body: null },
    });
    renderRoute(RUTA, RUTA, <RecoverPasswordPage />);

    fireEvent.change(screen.getByLabelText(/Correo/), {
      target: { value: 'ana@test.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Recuperar contraseña' }),
    );

    expect(
      await screen.findByText(/Si el correo está registrado/),
    ).toBeVisible();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      email: 'ana@test.com',
    });
  });

  it('valida el correo sin llamar al backend', () => {
    const fetchMock = mockApi({});
    renderRoute(RUTA, RUTA, <RecoverPasswordPage />);

    fireEvent.change(screen.getByLabelText(/Correo/), {
      target: { value: 'no-es-correo' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Recuperar contraseña' }),
    );

    expect(screen.getByLabelText(/Correo/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('avisa cuando se superó el límite diario', async () => {
    mockApi({
      'POST /auth/password-recovery': {
        status: 429,
        body: { error: 'recovery_rate_limited' },
      },
    });
    renderRoute(RUTA, RUTA, <RecoverPasswordPage />);

    fireEvent.change(screen.getByLabelText(/Correo/), {
      target: { value: 'ana@test.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Recuperar contraseña' }),
    );

    expect(await screen.findByText(/Ya pediste dos enlaces hoy/)).toBeVisible();
  });

  it('con el token del enlace guarda la contraseña nueva', async () => {
    const fetchMock = mockApi({
      'POST /auth/password-reset': { status: 204, body: null },
    });
    renderRoute(RUTA, `${RUTA}?token=abc123`, <RecoverPasswordPage />);

    escribirContrasenas('Nueva2026');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(await screen.findByText('Listo, ya podés ingresar.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      token: 'abc123',
      password: 'Nueva2026',
    });
  });

  it('no envía si las contraseñas no coinciden', () => {
    const fetchMock = mockApi({});
    renderRoute(RUTA, `${RUTA}?token=abc123`, <RecoverPasswordPage />);

    escribirContrasenas('Nueva2026', 'Otra2026');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(screen.getByText('Las contraseñas no coinciden.')).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con un enlace vencido ofrece pedir uno nuevo', async () => {
    mockApi({
      'POST /auth/password-reset': {
        status: 400,
        body: { error: 'invalid_recovery_token' },
      },
    });
    renderRoute(RUTA, `${RUTA}?token=vencido`, <RecoverPasswordPage />);

    escribirContrasenas('Nueva2026');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(await screen.findByText('El enlace ya no sirve')).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: 'Pedir un enlace nuevo' }),
    );
    expect(
      screen.getByRole('form', { name: 'Pedir enlace de recuperación' }),
    ).toBeVisible();
  });

  it('muestra las reglas que rechaza el backend', async () => {
    mockApi({
      'POST /auth/password-reset': {
        status: 400,
        body: {
          error: 'weak_password',
          fields: { password: ['La contraseña no puede contener tu correo'] },
        },
      },
    });
    renderRoute(RUTA, `${RUTA}?token=abc123`, <RecoverPasswordPage />);

    escribirContrasenas('Nueva2026');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(
      await screen.findByText(/no puede contener tu correo/),
    ).toBeVisible();
  });
});
