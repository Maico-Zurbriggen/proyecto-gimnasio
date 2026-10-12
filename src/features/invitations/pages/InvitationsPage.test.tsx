import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { InvitationsPage } from './InvitationsPage';

const ENVIADA = {
  id: '31000000-0000-4000-8000-000000000001',
  email: 'ana@test.com',
  roles: ['ALUMNO'],
  status: 'PENDIENTE',
  issuedAt: '2026-10-12T12:00:00.000Z',
  expiresAt: '2026-10-26T12:00:00.000Z',
  issuedByName: 'Lucía',
};

describe('InvitationsPage (FL-19)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('el entrenador invita a un alumno y ve la invitación enviada', async () => {
    const fetchMock = mockApi({
      'GET /invitations': { body: [ENVIADA] },
      'POST /invitations': {
        status: 201,
        body: {
          id: ENVIADA.id,
          email: 'nuevo@test.com',
          roles: ['ALUMNO'],
          expiresAt: '2026-10-26T12:00:00.000Z',
          trainerName: 'Lucía',
        },
      },
    });
    renderRoute(
      '/entrenador/invitaciones',
      '/entrenador/invitaciones',
      <InvitationsPage canChooseRoles={false} />,
    );

    expect(await screen.findByText('ana@test.com')).toBeVisible();
    expect(screen.getByText('◷ Pendiente')).toBeVisible();
    expect(screen.queryByRole('group', { name: /Roles/ })).toBeNull();

    fireEvent.change(screen.getByLabelText(/Correo/), {
      target: { value: 'nuevo@test.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    expect(await screen.findByText('Invitación enviada')).toBeVisible();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      email: 'nuevo@test.com',
      roles: ['ALUMNO'],
    });
  });

  it('valida el correo junto al campo sin llamar al backend', async () => {
    const fetchMock = mockApi({ 'GET /invitations': { body: [] } });
    renderRoute(
      '/entrenador/invitaciones',
      '/entrenador/invitaciones',
      <InvitationsPage canChooseRoles={false} />,
    );

    await screen.findByText('Todavía no enviaste invitaciones.');
    fireEvent.change(screen.getByLabelText(/Correo/), {
      target: { value: 'no-es-correo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    expect(
      screen.getByText('El correo no tiene un formato válido.'),
    ).toBeVisible();
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(false);
  });

  it('el administrador elige roles y ve el conflicto del backend en el campo', async () => {
    mockApi({
      'GET /invitations': { body: [] },
      'POST /invitations': {
        status: 409,
        body: {
          error: 'email_already_registered',
          fields: { email: ['Ese correo ya tiene una cuenta en el gimnasio'] },
        },
      },
    });
    renderRoute(
      '/admin/usuarios',
      '/admin/usuarios',
      <InvitationsPage canChooseRoles />,
    );

    await screen.findByText('Todavía no enviaste invitaciones.');
    fireEvent.click(screen.getByLabelText('Entrenador'));
    fireEvent.change(screen.getByLabelText(/Correo/), {
      target: { value: 'coach@test.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    expect(
      await screen.findByText('Ese correo ya tiene una cuenta en el gimnasio'),
    ).toBeVisible();
  });
});
