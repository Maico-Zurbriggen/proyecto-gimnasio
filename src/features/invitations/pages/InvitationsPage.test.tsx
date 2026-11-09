import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { InvitationsPage } from './InvitationsPage';

const ID = '31000000-0000-4000-8000-000000000001';

const VIGENTE = {
  id: ID,
  email: 'ana@test.com',
  roles: ['ALUMNO'],
  status: 'VIGENTE',
  issuedAt: '2026-10-12T12:00:00.000Z',
  expiresAt: '2026-10-26T12:00:00.000Z',
  issuedByName: 'Lucía',
};

const EMITIDA = {
  id: '31000000-0000-4000-8000-000000000002',
  email: 'nuevo@test.com',
  roles: ['ALUMNO'],
  status: 'VIGENTE',
  issuedAt: '2026-10-12T12:00:00.000Z',
  expiresAt: '2026-10-26T12:00:00.000Z',
  trainerName: 'Lucía',
  emailFailed: false,
};

/** La tabla (escritorio) es la primera de las dos vistas del listado. */
function filaDeTabla(email: string): HTMLElement {
  const celda = screen
    .getAllByText(email)
    .find((el) => el.closest('tr') !== null);
  if (!celda) throw new Error(`No hay fila para ${email}`);
  return celda.closest('tr') as HTMLElement;
}

function renderTrainer() {
  return renderRoute(
    '/entrenador/invitaciones',
    '/entrenador/invitaciones',
    <InvitationsPage canChooseRoles={false} />,
  );
}

describe('InvitationsPage (HU08 - T3)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('el entrenador invita a un alumno y ve la invitación enviada', async () => {
    const fetchMock = mockApi({
      'GET /invitations': { body: [VIGENTE] },
      'POST /invitations': { status: 201, body: EMITIDA },
    });
    renderTrainer();

    await screen.findAllByText('ana@test.com');
    const fila = filaDeTabla('ana@test.com');
    expect(within(fila).getByText('Vigente')).toBeVisible();
    expect(within(fila).getByText('Lucía')).toBeVisible();
    expect(screen.queryByRole('group', { name: /Roles/ })).toBeNull();
    // Criterio front 8: el entrenador ve el rol fijo y deshabilitado.
    expect(screen.getByLabelText('Rol')).toBeDisabled();

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

  it('avisa si la invitación quedó creada pero el correo no salió', async () => {
    mockApi({
      'GET /invitations': { body: [] },
      'POST /invitations': {
        status: 201,
        body: { ...EMITIDA, emailFailed: true },
      },
    });
    renderTrainer();

    await screen.findByText('Todavía no enviaste invitaciones.');
    fireEvent.change(screen.getByLabelText(/Correo/), {
      target: { value: 'nuevo@test.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    expect(
      await screen.findByText('Invitación creada sin enviar'),
    ).toBeVisible();
  });

  it('valida el correo junto al campo sin llamar al backend', async () => {
    const fetchMock = mockApi({ 'GET /invitations': { body: [] } });
    renderTrainer();

    await screen.findByText('Todavía no enviaste invitaciones.');
    fireEvent.change(screen.getByLabelText(/Correo/), {
      target: { value: 'no-es-correo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    expect(screen.getByLabelText(/Correo/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(
      screen.getByText(/El correo no tiene un formato válido/),
    ).toBeVisible();
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(false);
  });

  it('el estado vacío lleva el foco al correo', async () => {
    mockApi({ 'GET /invitations': { body: [] } });
    renderTrainer();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Crear la primera invitación',
      }),
    );
    expect(screen.getByLabelText(/Correo/)).toHaveFocus();
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

  it('revoca una invitación vigente después de confirmar', async () => {
    let revocada = false;
    const fetchMock = mockApi({
      'GET /invitations': () => ({
        body: [revocada ? { ...VIGENTE, status: 'REVOCADA' } : VIGENTE],
      }),
      [`DELETE /invitations/${ID}`]: () => {
        revocada = true;
        return { status: 204, body: null };
      },
    });
    renderTrainer();

    await screen.findAllByText('ana@test.com');
    const fila = filaDeTabla('ana@test.com');
    fireEvent.click(within(fila).getByRole('button', { name: 'Revocar' }));
    const dialogo = within(fila).getByRole('alertdialog');
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE'),
    ).toBe(false);
    fireEvent.click(
      within(dialogo).getByRole('button', { name: 'Sí, revocar' }),
    );

    expect(
      await within(filaDeTabla('ana@test.com')).findByText('Revocada'),
    ).toBeVisible();
    // Una invitación no vigente no ofrece acciones.
    expect(
      within(filaDeTabla('ana@test.com')).queryByRole('button', {
        name: 'Revocar',
      }),
    ).toBeNull();
  });

  it('muestra el motivo si el backend rechaza la revocación', async () => {
    mockApi({
      'GET /invitations': { body: [VIGENTE] },
      [`DELETE /invitations/${ID}`]: {
        status: 409,
        body: {
          error: 'invitation_not_revocable',
          message: 'La invitación ya se usó para crear una cuenta',
          estado: 'USADA',
        },
      },
    });
    renderTrainer();

    await screen.findAllByText('ana@test.com');
    const fila = filaDeTabla('ana@test.com');
    fireEvent.click(within(fila).getByRole('button', { name: 'Revocar' }));
    fireEvent.click(within(fila).getByRole('button', { name: 'Sí, revocar' }));

    expect(
      await within(fila).findByText(
        'La invitación ya se usó para crear una cuenta',
      ),
    ).toBeVisible();
  });

  it('reenvía una invitación vigente', async () => {
    mockApi({
      'GET /invitations': { body: [VIGENTE] },
      [`POST /invitations/${ID}/resend`]: {
        body: { emailFailed: false, expiresAt: '2026-10-27T12:00:00.000Z' },
      },
    });
    renderTrainer();

    await screen.findAllByText('ana@test.com');
    const fila = filaDeTabla('ana@test.com');
    fireEvent.click(within(fila).getByRole('button', { name: 'Reenviar' }));

    expect(
      await within(fila).findByText(/Reenviada a ana@test.com/),
    ).toBeVisible();
  });

  it('ofrece reintentar si falla la carga del listado', async () => {
    mockApi({
      'GET /invitations': { status: 500, body: { error: 'internal' } },
    });
    renderTrainer();

    expect(
      await screen.findByText('No pudimos cargar las invitaciones.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});
