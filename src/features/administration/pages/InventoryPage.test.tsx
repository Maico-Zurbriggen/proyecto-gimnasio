import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { GymSetupChecklist } from '../components/GymSetupChecklist';
import { InventoryPage } from './InventoryPage';

const VACIO = {
  equipment: [
    {
      code: 'PESO_CORPORAL',
      name: 'Peso corporal',
      present: true,
      alwaysPresent: true,
    },
    {
      code: 'BARRA',
      name: 'Barra olimpica',
      present: false,
      alwaysPresent: false,
    },
  ],
  prescribableExercises: 4,
  totalExercises: 20,
  missingPatterns: ['TRACCION', 'DOMINANTE_CADERA'],
  onlyBodyweight: true,
};

describe('InventoryPage (FL-20)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('advierte inventario vacío y patrones sin cubrir; el peso corporal no se puede quitar', async () => {
    mockApi({ 'GET /admin/inventory': { body: VACIO } });
    renderRoute('/admin/inventario', '/admin/inventario', <InventoryPage />);

    expect(await screen.findByText('Inventario vacío')).toBeVisible();
    expect(
      screen.getByText(/tracción \(horizontal o vertical\)/),
    ).toBeVisible();
    expect(screen.getByLabelText(/Peso corporal/)).toBeDisabled();
    expect(screen.getByLabelText(/Peso corporal/)).toBeChecked();
  });

  it('guarda lo marcado e informa los ejercicios que quedaron incompatibles', async () => {
    const fetchMock = mockApi({
      'GET /admin/inventory': { body: VACIO },
      'PUT /admin/inventory': {
        body: {
          ...VACIO,
          onlyBodyweight: false,
          missingPatterns: [],
          markedIncompatible: 0,
          restored: 3,
        },
      },
      'GET /admin/setup': {
        body: { hasTrainer: true, hasInventory: true, ready: true },
      },
    });
    renderRoute('/admin/inventario', '/admin/inventario', <InventoryPage />);

    fireEvent.click(await screen.findByLabelText('Barra olimpica'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar inventario' }));

    expect(
      await screen.findByText(/3 ejercicios volvieron a estar disponibles/),
    ).toBeVisible();
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ present: ['BARRA'] });
  });
});

describe('GymSetupChecklist (CB-59)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra los pasos que faltan para que alguien pueda entrenar', async () => {
    mockApi({
      'GET /admin/setup': {
        body: { hasTrainer: true, hasInventory: false, ready: false },
      },
    });
    renderRoute('/admin', '/admin', <GymSetupChecklist />);

    expect(
      await screen.findByText('Todavía nadie puede entrenar en el gimnasio.'),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Ir a Inventario' }),
    ).toHaveAttribute('href', '/admin/inventario');
    expect(
      screen.queryByRole('link', { name: 'Ir a Invitaciones' }),
    ).toBeNull();
  });

  it('desaparece cuando el gimnasio está listo', async () => {
    mockApi({
      'GET /admin/setup': {
        body: { hasTrainer: true, hasInventory: true, ready: true },
      },
    });
    const { container } = renderRoute(
      '/admin',
      '/admin',
      <GymSetupChecklist />,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(container).toBeEmptyDOMElement();
  });
});
