import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { GenerationSettingsPage } from './GenerationSettingsPage';

describe('GenerationSettingsPage', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('saves administrator ranges and their current revision', async () => {
    let saved: Record<string, unknown> | undefined;
    mockApi({
      'GET /gyms/me/generation-settings': {
        body: { settings: null, revision: 3 },
      },
      'PUT /gyms/me/generation-settings': (init) => {
        saved = JSON.parse(String(init?.body));
        return { body: { ...saved, revision: 4 } };
      },
    });
    renderRoute(
      '/admin/configuracion',
      '/admin/configuracion',
      <GenerationSettingsPage />,
    );
    const checkbox = await screen.findByRole('checkbox', {
      name: 'Usar parámetros definidos por el gimnasio',
    });
    const min = screen.getByRole('spinbutton', {
      name: 'Ejercicios por día: mínimo',
    });
    expect(min).toBeDisabled();
    fireEvent.click(checkbox);
    fireEvent.change(min, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar parámetros' }));
    expect(
      await screen.findByText(
        'Parámetros guardados. Se usarán en las próximas generaciones.',
      ),
    ).toBeVisible();
    expect(saved).toMatchObject({
      revision: 3,
      settings: { minExercisesPerDay: 3, maxExercisesPerDay: 6 },
    });
  });
  it('offers a reload when another administrator changed the configuration', async () => {
    mockApi({
      'GET /gyms/me/generation-settings': {
        body: { settings: null, revision: 0 },
      },
      'PUT /gyms/me/generation-settings': {
        status: 409,
        body: { error: 'generation_settings_conflict' },
      },
    });
    renderRoute(
      '/admin/configuracion',
      '/admin/configuracion',
      <GenerationSettingsPage />,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Guardar parámetros' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Recargar parámetros' }),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('otra sesión');
  });
});
