import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderRoute } from '../../../../test/apiMocks';
import { AccountProfilePage } from './AccountProfilePage';

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({
    user: {
      id: 'user-1',
      gymId: 'gym-1',
      displayName: 'Lucía Entrenadora',
      email: 'lucia@vivaz.test',
      gymName: 'Vivaz Demo',
      roles: ['ENTRENADOR', 'ADMINISTRADOR'],
    },
  }),
}));

describe('AccountProfilePage', () => {
  it('muestra la identidad, el gimnasio, los roles y el acceso de seguridad', () => {
    renderRoute('/cuenta/perfil', '/cuenta/perfil', <AccountProfilePage />);

    expect(screen.getByText('Lucía Entrenadora')).toBeVisible();
    expect(screen.getByText('lucia@vivaz.test')).toBeVisible();
    expect(screen.getByText('Vivaz Demo')).toBeVisible();
    expect(screen.getByText('Entrenador')).toBeVisible();
    expect(screen.getByText('Administrador')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Cambiar contraseña' }),
    ).toHaveAttribute('href', '/cuenta/contrasena');
  });
});
