import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { CreateGymPage } from './CreateGymPage';
import { GymsPage } from './GymsPage';

const GYM = {
  id: '10000000-0000-4000-8000-000000000099',
  name: 'Gimnasio Norte',
  timezone: 'America/Argentina/Cordoba',
  status: 'ACTIVO',
  createdAt: '2026-10-12T12:00:00.000Z',
  administratorCount: 0,
  bootstrapInvitation: {
    email: 'admin@norte.test',
    status: 'VENCIDA',
    expiresAt: '2026-10-26T12:00:00.000Z',
  },
};

const ZONAS = ['America/Argentina/Buenos_Aires', 'America/Argentina/Cordoba'];

describe('GymsPage (HU13 - T2)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra un estado vacío explicativo', async () => {
    mockApi({ 'GET /platform/gyms': { body: [] } });
    renderRoute('/superadmin', '/superadmin', <GymsPage />);

    expect(
      await screen.findByText('Todavía no hay gimnasios afiliados.'),
    ).toBeVisible();
  });

  it('ofrece reintentar si falla la carga', async () => {
    mockApi({
      'GET /platform/gyms': { status: 500, body: { error: 'x' } },
    });
    renderRoute('/superadmin', '/superadmin', <GymsPage />);

    expect(
      await screen.findByRole('button', { name: 'Reintentar' }),
    ).toBeVisible();
  });

  it('lista datos, estado de la invitación en texto y permite reenviarla', async () => {
    const fetchMock = mockApi({
      'GET /platform/gyms': { body: [GYM] },
      [`POST /platform/gyms/${GYM.id}/bootstrap-invitation`]: {
        status: 201,
        body: {
          invitationSentTo: 'admin@norte.test',
          invitationExpiresAt: '2026-10-26T12:00:00.000Z',
        },
      },
    });
    renderRoute('/superadmin', '/superadmin', <GymsPage />);

    expect(await screen.findByText('Gimnasio Norte')).toBeVisible();
    expect(screen.getByText(/America\/Argentina\/Cordoba/)).toBeVisible();
    expect(screen.getByText('Invitación vencida')).toBeVisible();

    fireEvent.click(
      screen.getByRole('button', { name: 'Reenviar invitación' }),
    );

    expect(
      await screen.findByText('Enviada a admin@norte.test.'),
    ).toBeVisible();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          init?.method === 'POST' &&
          String(url).endsWith('/bootstrap-invitation'),
      ),
    ).toBe(true);
  });
});

describe('CreateGymPage (HU13 - T1)', () => {
  afterEach(() => vi.unstubAllGlobals());

  function renderCreate(routes: Parameters<typeof mockApi>[0] = {}) {
    const fetchMock = mockApi({
      'GET /platform/timezones': { body: ZONAS },
      ...routes,
    });
    renderRoute(
      '/superadmin/gimnasios/nuevo',
      '/superadmin/gimnasios/nuevo',
      <CreateGymPage />,
    );
    return fetchMock;
  }

  async function completar(correo = 'admin@norte.test') {
    await screen.findByRole('option', { name: 'America/Argentina/Cordoba' });
    fireEvent.change(screen.getByLabelText(/Nombre del gimnasio/), {
      target: { value: 'Gimnasio Norte' },
    });
    fireEvent.change(screen.getByLabelText(/Zona horaria/), {
      target: { value: 'America/Argentina/Cordoba' },
    });
    fireEvent.change(screen.getByLabelText(/Correo del primer administrador/), {
      target: { value: correo },
    });
  }

  it('la zona horaria sólo se elige de la lista IANA del backend', async () => {
    renderCreate();

    const zona = await screen.findByLabelText(/Zona horaria/);
    expect(zona.tagName).toBe('SELECT');
    await screen.findByRole('option', { name: 'America/Argentina/Cordoba' });
  });

  it('valida campos obligatorios y formato del correo junto a cada campo', async () => {
    const fetchMock = renderCreate();
    await completar('no-es-correo');
    fireEvent.change(screen.getByLabelText(/Nombre del gimnasio/), {
      target: { value: '   ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Crear gimnasio' }));

    expect(
      screen.getByText('Ingresá el nombre del gimnasio.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/El correo no tiene un formato válido/),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(false);
  });

  it('confirma la creación e informa a qué correo se envió la invitación', async () => {
    const fetchMock = renderCreate({
      'POST /platform/gyms': {
        status: 201,
        body: {
          id: GYM.id,
          name: 'Gimnasio Norte',
          timezone: 'America/Argentina/Cordoba',
          createdAt: '2026-10-12T12:00:00.000Z',
          invitationSentTo: 'admin@norte.test',
          invitationExpiresAt: '2026-10-26T12:00:00.000Z',
        },
      },
      'GET /platform/gyms': { body: [] },
    });
    await completar();

    fireEvent.click(screen.getByRole('button', { name: 'Crear gimnasio' }));

    expect(await screen.findByText('Gimnasio creado')).toBeVisible();
    expect(screen.getByText('admin@norte.test')).toBeVisible();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      nombre: 'Gimnasio Norte',
      zonaHoraria: 'America/Argentina/Cordoba',
      correoAdministrador: 'admin@norte.test',
    });
  });

  it('si falla no informa ningún gimnasio como creado', async () => {
    renderCreate({
      'POST /platform/gyms': {
        status: 502,
        body: { error: 'invitation_delivery_failed' },
      },
    });
    await completar();

    fireEvent.click(screen.getByRole('button', { name: 'Crear gimnasio' }));

    expect(await screen.findByText(/el gimnasio no se creó/)).toBeVisible();
    expect(screen.queryByText('Gimnasio creado')).toBeNull();
  });

  it('muestra junto al campo el error de nombre duplicado del backend', async () => {
    renderCreate({
      'POST /platform/gyms': {
        status: 409,
        body: {
          error: 'gym_name_taken',
          fields: { nombre: ['Ya existe un gimnasio con ese nombre'] },
        },
      },
    });
    await completar();

    fireEvent.click(screen.getByRole('button', { name: 'Crear gimnasio' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre del gimnasio/)).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    });
    expect(
      screen.getByText('Ya existe un gimnasio con ese nombre'),
    ).toBeVisible();
  });
});
