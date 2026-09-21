import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as authApi from '../../../api/auth';
import { ApiError } from '../../../api/client';
import { SessionProvider } from '../hooks/useSession';
import { LoginPage } from './LoginPage';

function renderLogin() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/ingresar']}>
        <SessionProvider>
          <LoginPage />
        </SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function completar(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Correo'), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: password },
  });
}

function entrar() {
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginPage (HU07 - T6)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envía las credenciales ingresadas', async () => {
    vi.spyOn(authApi, 'fetchSession').mockRejectedValue(
      new ApiError(401, 'unauthorized'),
    );
    const login = vi.spyOn(authApi, 'login').mockResolvedValue({
      user: { id: 'u1', gymId: 'g1', roles: ['ALUMNO'] },
      expiresAt: '2026-10-20T12:00:00.000Z',
    });

    renderLogin();
    completar('alumno@gym.test', 'unaClave123');
    entrar();

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'alumno@gym.test',
        password: 'unaClave123',
      });
    });
  });

  it('muestra un error genérico ante credenciales incorrectas', async () => {
    vi.spyOn(authApi, 'fetchSession').mockRejectedValue(
      new ApiError(401, 'unauthorized'),
    );
    vi.spyOn(authApi, 'login').mockRejectedValue(
      new ApiError(401, 'invalid_credentials'),
    );

    renderLogin();
    completar('alumno@gym.test', 'claveIncorrecta');
    entrar();

    const error = await screen.findByRole('alert');
    // No distingue correo inexistente de contraseña incorrecta: el backend
    // tampoco lo hace, y la interfaz no debe inventar esa diferencia.
    expect(error.textContent).toContain('correo o la contraseña');
  });

  it('distingue un fallo del servidor de unas credenciales incorrectas', async () => {
    vi.spyOn(authApi, 'fetchSession').mockRejectedValue(
      new ApiError(401, 'unauthorized'),
    );
    vi.spyOn(authApi, 'login').mockRejectedValue(
      new ApiError(500, 'internal_server_error'),
    );

    renderLogin();
    completar('alumno@gym.test', 'unaClave123');
    entrar();

    const error = await screen.findByRole('alert');
    expect(error.textContent).toContain('No pudimos iniciar sesión');
  });
});
