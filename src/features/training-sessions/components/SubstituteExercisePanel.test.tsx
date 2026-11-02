import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SubstituteExercisePanel } from './SubstituteExercisePanel';

const api = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn() }));
vi.mock('../../../api/catalog', () => ({
  listCatalog: api.list,
  getExercise: api.get,
}));

const item = (id: string, name: string) => ({ id, name });

function setup(props: {
  prescribedExerciseId?: string;
  defaultExerciseId?: string;
}) {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ id: 'p', movementPattern: 'EMPUJE_HORIZONTAL' });
  api.list.mockImplementation((query: { pattern?: string }) =>
    Promise.resolve({
      items: query.pattern
        ? [item('p', 'Prescripto'), item('a', 'Alternativa')]
        : [
            item('p', 'Prescripto'),
            item('a', 'Alternativa'),
            item('o', 'Otro'),
          ],
    }),
  );
  const onPick = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SubstituteExercisePanel
        position={1}
        disabled={false}
        onPick={onPick}
        onCancel={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  );
  return onPick;
}

describe('SubstituteExercisePanel (HU22)', () => {
  it('muestra primero alternativas del mismo patrón sin el prescripto', async () => {
    const onPick = setup({ prescribedExerciseId: 'p' });
    const same = await screen.findByRole('region', {
      name: /mismo patrón de movimiento/i,
    });
    await waitFor(() => {
      expect(same).toHaveTextContent('Alternativa');
    });
    expect(same).not.toHaveTextContent('Prescripto');
    expect(api.get).toHaveBeenCalledWith('p', expect.anything());
    expect(api.list).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: 'EMPUJE_HORIZONTAL',
        state: 'APROBADO',
        enabled: 'true',
      }),
      expect.anything(),
    );
    // El buscador complementa con otros ejercicios, sin repetir ni el prescripto.
    fireEvent.click(await screen.findByRole('button', { name: 'Otro' }));
    expect(onPick).toHaveBeenCalledWith('o');
    expect(screen.queryByRole('button', { name: 'Prescripto' })).toBeNull();
  });

  it('ofrece repetir el ejercicio por defecto o elegir otro', async () => {
    const onPick = setup({ defaultExerciseId: 'last' });
    fireEvent.click(
      screen.getByRole('button', { name: /mismo ejercicio que la última/i }),
    );
    expect(onPick).toHaveBeenCalledWith('last');
    fireEvent.click(await screen.findByRole('button', { name: 'Otro' }));
    expect(onPick).toHaveBeenCalledWith('o');
    expect(api.get).not.toHaveBeenCalled();
  });
});
