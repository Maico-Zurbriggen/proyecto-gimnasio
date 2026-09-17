import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { InvitationStatusCard } from './InvitationStatusCard';

describe('InvitationStatusCard (HU06 - T6)', () => {
  it('renderiza correctamente el estado de invitación vencida', () => {
    render(
      <MemoryRouter>
        <InvitationStatusCard type="invitation_expired" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Invitación vencida')).toBeInTheDocument();
    expect(
      screen.getByText(/Esta invitación ha caducado/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Volver al Inicio/i }),
    ).toHaveAttribute('href', '/');
  });

  it('renderiza correctamente el estado de invitación ya usada', () => {
    render(
      <MemoryRouter>
        <InvitationStatusCard type="invitation_already_used" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Invitación ya utilizada')).toBeInTheDocument();
    expect(
      screen.getByText(/Esta invitación ya fue completada anteriormente/i),
    ).toBeInTheDocument();
  });

  it('renderiza correctamente el estado de invitación revocada', () => {
    render(
      <MemoryRouter>
        <InvitationStatusCard type="invitation_revoked" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Invitación revocada')).toBeInTheDocument();
  });

  it('renderiza correctamente el estado de invitación no encontrada', () => {
    render(
      <MemoryRouter>
        <InvitationStatusCard type="invitation_not_found" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Enlace no válido')).toBeInTheDocument();
  });
});
