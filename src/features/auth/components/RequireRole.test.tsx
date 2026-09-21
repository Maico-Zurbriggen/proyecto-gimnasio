import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as sessionHook from '../hooks/useSession';
import { RequireRole } from './RequireRole';

function mockSession(
  roles: NonNullable<sessionHook.SessionContextValue['user']>['roles'],
) {
  vi.spyOn(sessionHook, 'useSession').mockReturnValue({
    user: { id: 'user-1', gymId: 'gym-1', roles },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

function renderProtectedAdmin() {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<RequireRole role="ADMINISTRADOR" />}>
          <Route path="/admin" element={<p>Área administrativa</p>} />
        </Route>
        <Route path="/alumno" element={<p>Área del alumno</p>} />
        <Route path="/entrenador" element={<p>Área del entrenador</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireRole', () => {
  afterEach(() => vi.restoreAllMocks());

  it('redirects a student away from the admin area', async () => {
    mockSession(['ALUMNO']);
    renderProtectedAdmin();

    expect(await screen.findByText('Área del alumno')).toBeTruthy();
    expect(screen.queryByText('Área administrativa')).toBeNull();
  });

  it('allows a multi-role user into an area it owns', async () => {
    mockSession(['ALUMNO', 'ADMINISTRADOR']);
    renderProtectedAdmin();

    expect(await screen.findByText('Área administrativa')).toBeTruthy();
  });
});
