import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, type MockResponse } from '../../../../test/apiMocks';
import { SessionProvider } from '../../auth/hooks/useSession';
import { CompleteAccountPage } from './CompleteAccountPage';

const TOKEN = 'e48ca620-13d8-4f24-9b59-7b70743b1790';
const GYM_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const INVITACION = {
  id: TOKEN,
  gymId: GYM_ID,
  gymName: 'Gimnasio Central',
  email: 'nuevo.alumno@gym.test',
  roles: ['ALUMNO'],
  expiresAt: '2026-09-25T10:00:00.000Z',
};

/** Sin sesión previa: el proveedor pregunta por `GET /auth/me` al montar. */
const SIN_SESION: MockResponse = {
  status: 401,
  body: { error: 'unauthorized' },
};

function renderPage(routes: Record<string, MockResponse> = {}) {
  const fetchMock = mockApi({
    'GET /auth/me': SIN_SESION,
    [`GET /invitations/${TOKEN}`]: { body: INVITACION },
    ...routes,
  });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/invitacion/${TOKEN}`]}>
        <SessionProvider>
          <Routes>
            <Route
              path="/invitacion/:token"
              element={<CompleteAccountPage />}
            />
            <Route path="/ingresar" element={<p>Iniciar sesión</p>} />
            <Route path="/alumno" element={<p>Área del alumno</p>} />
            <Route path="/entrenador" element={<p>Área del entrenador</p>} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return fetchMock;
}

function completarFormulario(
  nombre = 'Ana Pérez',
  contrasena = 'ClaveSegura2026',
  repeticion = contrasena,
) {
  fireEvent.change(screen.getByLabelText('Tu nombre'), {
    target: { value: nombre },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: contrasena },
  });
  fireEvent.change(screen.getByLabelText('Repetí la contraseña'), {
    target: { value: repeticion },
  });
}

function botonCrear() {
  return screen.getByRole('button', { name: /Crear cuenta/ });
}

describe('CompleteAccountPage (HU06)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('T1 y T5: validación del enlace y formulario', () => {
    it('muestra el gimnasio, el rol y el correo de la invitación vigente', async () => {
      renderPage();

      expect(
        await screen.findByRole('form', { name: 'Completar cuenta' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Gimnasio Central')).toBeInTheDocument();
      expect(screen.getByText('nuevo.alumno@gym.test')).toBeInTheDocument();
      expect(screen.getByText('alumno')).toBeInTheDocument();
    });

    it('avisa mientras verifica la invitación', () => {
      renderPage();

      expect(screen.getByRole('status')).toHaveTextContent(
        'Verificando la invitación',
      );
    });
  });

  describe('T6: mensajes por estado de la invitación', () => {
    it('invitación vencida', async () => {
      renderPage({
        [`GET /invitations/${TOKEN}`]: {
          status: 410,
          body: {
            error: 'invitation_expired',
            message: 'La invitación ha caducado',
          },
        },
      });

      expect(
        await screen.findByTestId('invitation-status-invitation_expired'),
      ).toBeInTheDocument();
      expect(screen.getByText('La invitación ha caducado')).toBeInTheDocument();
      expect(screen.queryByLabelText('Tu nombre')).not.toBeInTheDocument();
    });

    it('invitación ya usada, con acceso al inicio de sesión', async () => {
      renderPage({
        [`GET /invitations/${TOKEN}`]: {
          status: 409,
          body: { error: 'invitation_already_used' },
        },
      });

      expect(
        await screen.findByTestId('invitation-status-invitation_already_used'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Iniciar sesión' }),
      ).toBeInTheDocument();
    });

    it('invitación revocada', async () => {
      renderPage({
        [`GET /invitations/${TOKEN}`]: {
          status: 410,
          body: { error: 'invitation_revoked' },
        },
      });

      expect(
        await screen.findByTestId('invitation-status-invitation_revoked'),
      ).toBeInTheDocument();
    });

    it('enlace inexistente', async () => {
      renderPage({
        [`GET /invitations/${TOKEN}`]: {
          status: 404,
          body: { error: 'invitation_not_found' },
        },
      });

      expect(
        await screen.findByTestId('invitation-status-invitation_not_found'),
      ).toBeInTheDocument();
    });
  });

  describe('T4: habilitación del botón', () => {
    it('mantiene el botón deshabilitado hasta que la contraseña cumple los requisitos', async () => {
      renderPage();
      await screen.findByRole('form', { name: 'Completar cuenta' });

      expect(botonCrear()).toBeDisabled();

      completarFormulario('Ana Pérez', 'clavefacil');
      expect(botonCrear()).toBeDisabled();

      completarFormulario();
      expect(botonCrear()).toBeEnabled();
    });

    it('avisa cuando la repetición no coincide y no habilita el envío', async () => {
      renderPage();
      await screen.findByRole('form', { name: 'Completar cuenta' });

      completarFormulario('Ana Pérez', 'ClaveSegura2026', 'OtraClave2026');

      expect(
        screen.getByText('Las contraseñas no coinciden.'),
      ).toBeInTheDocument();
      expect(botonCrear()).toBeDisabled();
    });

    it('exige un nombre de al menos dos caracteres', async () => {
      renderPage();
      await screen.findByRole('form', { name: 'Completar cuenta' });

      completarFormulario('A');

      expect(botonCrear()).toBeDisabled();
    });
  });

  describe('T2 y T3: creación de la cuenta', () => {
    it('crea la cuenta, adopta la sesión y entra al área del rol', async () => {
      const fetchMock = renderPage({
        [`POST /invitations/${TOKEN}/complete`]: {
          status: 201,
          body: {
            user: { id: USER_ID, gymId: GYM_ID, roles: ['ALUMNO'] },
            expiresAt: '2026-10-21T10:00:00.000Z',
          },
        },
      });
      await screen.findByRole('form', { name: 'Completar cuenta' });

      completarFormulario('  Ana Pérez  ');
      fireEvent.click(botonCrear());

      expect(await screen.findByText('Área del alumno')).toBeInTheDocument();

      const llamada = fetchMock.mock.calls.find(
        ([, init]) => init?.method === 'POST',
      );
      expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({
        displayName: 'Ana Pérez',
        password: 'ClaveSegura2026',
      });
    });

    it('lleva al entrenador a su área cuando la invitación era para ese rol', async () => {
      renderPage({
        [`POST /invitations/${TOKEN}/complete`]: {
          status: 201,
          body: {
            user: { id: USER_ID, gymId: GYM_ID, roles: ['ENTRENADOR'] },
            expiresAt: '2026-10-21T10:00:00.000Z',
          },
        },
      });
      await screen.findByRole('form', { name: 'Completar cuenta' });

      completarFormulario();
      fireEvent.click(botonCrear());

      expect(
        await screen.findByText('Área del entrenador'),
      ).toBeInTheDocument();
    });

    it('T4: muestra el rechazo del servidor sin perder lo escrito', async () => {
      renderPage({
        [`POST /invitations/${TOKEN}/complete`]: {
          status: 422,
          body: {
            error: 'weak_password',
            message: 'La contraseña no cumple con los requisitos mínimos',
            details: ['Debe contener al menos un número.'],
          },
        },
      });
      await screen.findByRole('form', { name: 'Completar cuenta' });

      completarFormulario();
      fireEvent.click(botonCrear());

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'La contraseña no cumple con los requisitos mínimos',
      );
      expect(screen.getByLabelText('Tu nombre')).toHaveValue('Ana Pérez');
    });

    it('si la invitación se agota mientras se completa, explica el motivo', async () => {
      renderPage({
        [`POST /invitations/${TOKEN}/complete`]: {
          status: 409,
          body: { error: 'invitation_already_used' },
        },
      });
      await screen.findByRole('form', { name: 'Completar cuenta' });

      completarFormulario();
      fireEvent.click(botonCrear());

      await waitFor(() => {
        expect(
          screen.getByTestId('invitation-status-invitation_already_used'),
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByRole('form', { name: 'Completar cuenta' }),
      ).not.toBeInTheDocument();
    });
  });
});
