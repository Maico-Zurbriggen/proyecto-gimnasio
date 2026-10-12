import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, type MockResponse } from '../../../../test/apiMocks';
import { SessionProvider } from '../../auth/hooks/useSession';
import { CompleteAccountPage } from './CompleteAccountPage';

const TOKEN = 'tok_Yq3n8Kd2Lm5Pz7Rt0Vw4Xs6Bc9Fg1Hj';
const GYM_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const INVITACION = {
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

function renderPage(
  routes: Record<
    string,
    MockResponse | ((init?: RequestInit) => MockResponse)
  > = {},
) {
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
            <Route
              path="/alumno/puesta-en-contexto"
              element={<p>Puesta en contexto</p>}
            />
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
  fireEvent.change(screen.getByLabelText(/Tu nombre/), {
    target: { value: nombre },
  });
  fireEvent.change(screen.getByLabelText(/^Contraseña/), {
    target: { value: contrasena },
  });
  fireEvent.change(screen.getByLabelText(/Repetí la contraseña/), {
    target: { value: repeticion },
  });
}

function botonCrear() {
  return screen.getByRole('button', { name: /Crear cuenta/ });
}

const CREADA = (roles: string[]): MockResponse => ({
  status: 201,
  body: {
    user: { id: USER_ID, gymId: GYM_ID, roles },
    expiresAt: '2026-10-21T10:00:00.000Z',
  },
});

describe('CompleteAccountPage (HU06)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('T5: pantalla', () => {
    it('criterio 1: muestra el correo invitado visible y no editable', async () => {
      renderPage();

      expect(
        await screen.findByRole('form', { name: 'Completar cuenta' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Gimnasio Central')).toBeInTheDocument();
      const correo = screen.getByLabelText('Correo');
      expect(correo).toHaveValue('nuevo.alumno@gym.test');
      expect(correo).toHaveAttribute('readonly');
    });

    it('criterio 3: muestra un estado de carga mientras valida', () => {
      renderPage();

      expect(screen.getByRole('status')).toHaveTextContent(
        'Verificando la invitación',
      );
    });

    it('criterio 3: si falla la red ofrece reintentar', async () => {
      let llamadas = 0;
      renderPage({
        [`GET /invitations/${TOKEN}`]: () => {
          llamadas += 1;
          return llamadas === 1
            ? { status: 503, body: { error: 'internal_server_error' } }
            : { body: INVITACION };
        },
      });

      fireEvent.click(
        await screen.findByRole('button', { name: 'Reintentar' }),
      );

      expect(
        await screen.findByRole('form', { name: 'Completar cuenta' }),
      ).toBeInTheDocument();
    });

    it('criterio 2: un control accesible muestra y oculta la contraseña', async () => {
      renderPage();
      await screen.findByRole('form', { name: 'Completar cuenta' });

      const campo = screen.getByLabelText(/^Contraseña/);
      const control = screen.getByRole('button', {
        name: 'Mostrar contraseña',
      });
      expect(campo).toHaveAttribute('type', 'password');
      expect(control).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(control);

      expect(campo).toHaveAttribute('type', 'text');
      expect(
        screen.getByRole('button', { name: 'Ocultar contraseña' }),
      ).toHaveAttribute('aria-pressed', 'true');
    });

    it('criterio 5: los errores aparecen junto a cada campo, en texto', async () => {
      const fetchMock = renderPage();
      await screen.findByRole('form', { name: 'Completar cuenta' });

      completarFormulario('', 'ClaveSegura2026', 'OtraClave2026');
      fireEvent.click(botonCrear());

      const nombre = screen.getByLabelText(/Tu nombre/);
      expect(nombre).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Ingresá tu nombre.')).toBeInTheDocument();
      expect(
        screen.getByText('Las contraseñas no coinciden.'),
      ).toBeInTheDocument();
      expect(
        fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
      ).toBe(false);
    });

    it('criterio 6: lista los requisitos de la contraseña antes de enviar', async () => {
      renderPage();
      await screen.findByRole('form', { name: 'Completar cuenta' });

      expect(
        screen.getByLabelText('Requisitos de la contraseña'),
      ).toBeInTheDocument();
    });
  });

  it('muestra quién va a ser el profesor cuando lo invitó un entrenador', async () => {
    renderPage({
      [`GET /invitations/${TOKEN}`]: {
        body: { ...INVITACION, trainerName: 'Lucía Entrenadora' },
      },
    });

    expect(await screen.findByText('Lucía Entrenadora')).toBeVisible();
    expect(screen.getByText(/Tu profesor va a ser/)).toBeVisible();
  });

  describe('T6: mensajes por estado de la invitación', () => {
    it.each([
      [410, 'invitation_expired', 'La invitación venció'],
      [410, 'invitation_revoked', 'La invitación fue cancelada'],
      [409, 'invitation_already_used', 'Esta invitación ya se usó'],
      [404, 'invitation_not_found', 'El enlace no es válido'],
    ])(
      '%s %s: mensaje propio y sin formulario',
      async (status, error, titulo) => {
        renderPage({
          [`GET /invitations/${TOKEN}`]: { status, body: { error } },
        });

        expect(
          await screen.findByTestId(`invitation-status-${error}`),
        ).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: titulo })).toBeVisible();
        expect(screen.queryByLabelText(/Tu nombre/)).not.toBeInTheDocument();
      },
    );

    it('criterio 13: la invitación usada ofrece iniciar sesión', async () => {
      renderPage({
        [`GET /invitations/${TOKEN}`]: {
          status: 409,
          body: { error: 'invitation_already_used' },
        },
      });

      expect(
        await screen.findByRole('link', { name: 'Iniciar sesión' }),
      ).toBeInTheDocument();
    });

    it('criterio 11: la vencida sugiere pedir una nueva al gimnasio', async () => {
      renderPage({
        [`GET /invitations/${TOKEN}`]: {
          status: 410,
          body: { error: 'invitation_expired' },
        },
      });

      expect(
        await screen.findByText(/Pedile al gimnasio que te envíe una nueva/),
      ).toBeInTheDocument();
    });
  });

  describe('T2 y T3: creación de la cuenta', () => {
    it('criterio 9: el alumno queda autenticado y va a la puesta en contexto', async () => {
      const fetchMock = renderPage({
        [`POST /invitations/${TOKEN}/complete`]: CREADA(['ALUMNO']),
      });
      await screen.findByRole('form', { name: 'Completar cuenta' });

      completarFormulario('  Ana Pérez  ');
      fireEvent.click(botonCrear());

      expect(await screen.findByText('Puesta en contexto')).toBeInTheDocument();

      const llamada = fetchMock.mock.calls.find(
        ([, init]) => init?.method === 'POST',
      );
      expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({
        displayName: 'Ana Pérez',
        password: 'ClaveSegura2026',
      });
    });

    it('criterio 9: otro rol va a su pantalla inicial', async () => {
      renderPage({
        [`POST /invitations/${TOKEN}/complete`]: CREADA(['ENTRENADOR']),
      });
      await screen.findByRole('form', { name: 'Completar cuenta' });

      completarFormulario();
      fireEvent.click(botonCrear());

      expect(
        await screen.findByText('Área del entrenador'),
      ).toBeInTheDocument();
    });

    it('criterio 4: el botón se deshabilita mientras envía', async () => {
      let responder: (value: MockResponse) => void = () => undefined;
      const fetchMock = mockApi({
        'GET /auth/me': SIN_SESION,
        [`GET /invitations/${TOKEN}`]: { body: INVITACION },
      });
      fetchMock.mockImplementation(
        async (input: string, init?: RequestInit) => {
          const path = new URL(input).pathname;
          if (init?.method === 'POST') {
            const response = await new Promise<MockResponse>((resolve) => {
              responder = resolve;
            });
            return {
              ok: true,
              status: response.status ?? 200,
              json: async () => response.body,
            };
          }
          const body = path === '/auth/me' ? SIN_SESION.body : INVITACION;
          const status = path === '/auth/me' ? 401 : 200;
          return { ok: status === 200, status, json: async () => body };
        },
      );

      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
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
                <Route
                  path="/alumno/puesta-en-contexto"
                  element={<p>Puesta en contexto</p>}
                />
              </Routes>
            </SessionProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      );
      await screen.findByRole('form', { name: 'Completar cuenta' });

      completarFormulario();
      fireEvent.click(botonCrear());

      const boton = await screen.findByRole('button', {
        name: 'Creando cuenta…',
      });
      expect(boton).toBeDisabled();
      fireEvent.click(boton);
      expect(
        fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST'),
      ).toHaveLength(1);

      responder(CREADA(['ALUMNO']));
      expect(await screen.findByText('Puesta en contexto')).toBeInTheDocument();
    });

    it('criterio 7: muestra qué regla de la contraseña incumple según el back', async () => {
      renderPage({
        [`POST /invitations/${TOKEN}/complete`]: {
          status: 422,
          body: {
            error: 'weak_password',
            fields: { password: ['Debe contener al menos un número.'] },
          },
        },
      });
      await screen.findByRole('form', { name: 'Completar cuenta' });

      completarFormulario();
      fireEvent.click(botonCrear());

      expect(
        await screen.findByText('Debe contener al menos un número.'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Tu nombre/)).toHaveValue('Ana Pérez');
    });

    it('criterio 8: si el correo ya tiene cuenta lo dice y ofrece ingresar', async () => {
      renderPage({
        [`POST /invitations/${TOKEN}/complete`]: {
          status: 409,
          body: { error: 'user_already_exists', code: 'CUENTA_EXISTENTE' },
        },
      });
      await screen.findByRole('form', { name: 'Completar cuenta' });

      completarFormulario();
      fireEvent.click(botonCrear());

      expect(
        await screen.findByText(/Ese correo ya tiene una cuenta/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Iniciar sesión' }),
      ).toBeInTheDocument();
    });

    it('si la invitación se agota mientras se completa, explica el motivo', async () => {
      renderPage({
        [`POST /invitations/${TOKEN}/complete`]: {
          status: 409,
          body: { error: 'invitation_already_used', code: 'USADA' },
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

    it('criterio 10: no escribe el token en la consola', async () => {
      const log = vi.spyOn(console, 'log');
      const info = vi.spyOn(console, 'info');
      renderPage({
        [`POST /invitations/${TOKEN}/complete`]: CREADA(['ALUMNO']),
      });
      await screen.findByRole('form', { name: 'Completar cuenta' });

      completarFormulario();
      fireEvent.click(botonCrear());
      await screen.findByText('Puesta en contexto');

      const escrito = [...log.mock.calls, ...info.mock.calls].flat().join(' ');
      expect(escrito).not.toContain(TOKEN);
    });
  });
});
