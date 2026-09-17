import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { CompleteAccountPage } from './CompleteAccountPage';

const VALID_TOKEN = 'e48ca620-13d8-4f24-9b59-7b70743b1790';
const EXPIRED_TOKEN = 'e48ca620-13d8-4f24-9b59-7b70743b1791';
const USED_TOKEN = 'e48ca620-13d8-4f24-9b59-7b70743b1792';

describe('CompleteAccountPage (HU06 - T1, T2, T3, T4, T5, T6)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra estado de carga inicialmente', () => {
    mockApi({
      [`GET /invitations/${VALID_TOKEN}`]: {
        status: 200,
        body: {
          id: VALID_TOKEN,
          gymId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
          gymName: 'Titan Gym',
          email: 'alumno@example.com',
          roles: ['ALUMNO'],
          expiresAt: '2026-10-01T00:00:00Z',
        },
      },
    });

    renderRoute(
      '/invitacion/:token',
      `/invitacion/${VALID_TOKEN}`,
      <CompleteAccountPage />,
    );

    expect(screen.getByTestId('loading-invitation')).toBeInTheDocument();
  });

  it('muestra tarjeta de error si la invitación está expirada (T6)', async () => {
    mockApi({
      [`GET /invitations/${EXPIRED_TOKEN}`]: {
        status: 410,
        body: {
          error: 'invitation_expired',
          message: 'La invitación ha caducado',
        },
      },
    });

    renderRoute(
      '/invitacion/:token',
      `/invitacion/${EXPIRED_TOKEN}`,
      <CompleteAccountPage />,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('invitation-status-invitation_expired'),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Invitación vencida')).toBeInTheDocument();
  });

  it('muestra tarjeta de error si la invitación ya fue usada (T6)', async () => {
    mockApi({
      [`GET /invitations/${USED_TOKEN}`]: {
        status: 409,
        body: {
          error: 'invitation_already_used',
          message: 'Esta invitación ya fue utilizada',
        },
      },
    });

    renderRoute(
      '/invitacion/:token',
      `/invitacion/${USED_TOKEN}`,
      <CompleteAccountPage />,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('invitation-status-invitation_already_used'),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Invitación ya utilizada')).toBeInTheDocument();
  });

  it('permite completar la cuenta cuando el formulario es válido (T2, T3, T4, T5)', async () => {
    mockApi({
      [`GET /invitations/${VALID_TOKEN}`]: {
        status: 200,
        body: {
          id: VALID_TOKEN,
          gymId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
          gymName: 'Titan Gym',
          email: 'alumno@example.com',
          roles: ['ALUMNO'],
          expiresAt: '2026-10-01T00:00:00Z',
        },
      },
      [`POST /invitations/${VALID_TOKEN}/complete`]: (init) => {
        const body = JSON.parse(String(init?.body));
        return {
          status: 201,
          body: {
            token: 'mock-jwt-token-12345',
            user: {
              id: '11111111-1111-4111-a111-111111111111',
              gymId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
              email: 'alumno@example.com',
              displayName: body.displayName,
              roles: ['ALUMNO'],
            },
          },
        };
      },
    });

    renderRoute(
      '/invitacion/:token',
      `/invitacion/${VALID_TOKEN}`,
      <CompleteAccountPage />,
    );

    // Esperar a que cargue la invitación
    await waitFor(() => {
      expect(screen.getByText('Titan Gym')).toBeInTheDocument();
    });

    expect(screen.getByText('alumno@example.com')).toBeInTheDocument();

    const submitBtn = screen.getByTestId('complete-account-button');
    // Botón inicialmente deshabilitado (T4)
    expect(submitBtn).toBeDisabled();

    // Llenar nombre
    const nameInput = screen.getByLabelText(/Nombre completo/i);
    fireEvent.change(nameInput, { target: { value: 'Carlos Mendoza' } });

    // Llenar contraseña débil
    const passwordInput = screen.getByLabelText(/^Contraseña$/i);
    fireEvent.change(passwordInput, { target: { value: 'debil' } });
    expect(submitBtn).toBeDisabled();

    // Completar con contraseña fuerte
    fireEvent.change(passwordInput, {
      target: { value: 'PasswordFuerte2026' },
    });

    // Confirmar con contraseña diferente
    const confirmInput = screen.getByLabelText(/Confirmar contraseña/i);
    fireEvent.change(confirmInput, {
      target: { value: 'OtraCosaDistinta1' },
    });
    expect(
      screen.getByText('Las contraseñas no coinciden.'),
    ).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // Corregir confirmación
    fireEvent.change(confirmInput, {
      target: { value: 'PasswordFuerte2026' },
    });

    // Ahora sí está habilitado
    expect(submitBtn).toBeEnabled();

    // Enviar formulario
    fireEvent.click(submitBtn);

    // Debe mostrar la pantalla de éxito
    await waitFor(() => {
      expect(screen.getByTestId('account-created-success')).toBeInTheDocument();
    });

    expect(
      screen.getByText('¡Cuenta completada exitosamente!'),
    ).toBeInTheDocument();

    // Token guardado en localStorage (T3)
    expect(localStorage.getItem('auth_token')).toBe('mock-jwt-token-12345');
  });
});
