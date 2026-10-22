import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../../api/client';
import { usePendingSeriesSync, type EnviarSerie } from './usePendingSeriesSync';

const VALORES = {
  performedLoad: 80,
  performedRepetitions: 10,
  perceivedEffort: 7,
  completed: true,
};

function render(enviarSerie: EnviarSerie, onSesionCerrada = vi.fn()) {
  return renderHook(() =>
    usePendingSeriesSync({ enviarSerie, onSesionCerrada }),
  );
}

describe('usePendingSeriesSync', () => {
  it('RNF-10: una serie encolada queda pendiente hasta confirmarse', () => {
    const enviar = vi.fn<EnviarSerie>(() => new Promise<void>(() => {}));
    const { result } = render(enviar);

    act(() => {
      result.current.encolar(1, VALORES);
    });

    expect(result.current.pendientes).toHaveLength(1);
    expect(result.current.pendientes[0]?.position).toBe(1);
  });

  it('CB-24: al volver la conexión reenvía la cola', async () => {
    let red = false;
    const enviar = vi.fn<EnviarSerie>(async () => {
      if (!red) throw new TypeError('Failed to fetch');
    });
    const { result } = render(enviar);

    act(() => {
      result.current.encolar(1, VALORES);
    });
    await waitFor(() => {
      expect(result.current.pendientes[0]?.intentos).toBe(1);
    });

    red = true;
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.pendientes).toHaveLength(0);
    });
  });

  it('reintenta cuando la pestaña vuelve al frente', async () => {
    let red = false;
    const enviar = vi.fn<EnviarSerie>(async () => {
      if (!red) throw new TypeError('Failed to fetch');
    });
    const { result } = render(enviar);

    act(() => {
      result.current.encolar(1, VALORES);
    });
    await waitFor(() => {
      expect(result.current.pendientes).toHaveLength(1);
    });

    red = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(result.current.pendientes).toHaveLength(0);
    });
  });

  it('RN-60: encolar dos veces la misma serie no genera dos envíos', async () => {
    const enviar = vi.fn<EnviarSerie>(async () => {});
    const { result } = render(enviar);

    act(() => {
      result.current.encolar(1, VALORES);
      result.current.encolar(1, { ...VALORES, performedLoad: 85 });
    });

    await waitFor(() => {
      expect(result.current.pendientes).toHaveLength(0);
    });
    // La cola nunca tuvo dos entradas para la posición 1: la corrección
    // reemplazó a la original. Y el valor corregido llega igual, aunque el
    // primer envío ya hubiera salido con el valor viejo.
    expect(enviar).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ performedLoad: 85 }),
    );
  });

  it('criterio 8: una sesión que ya no admite registros se informa', async () => {
    const onSesionCerrada = vi.fn();
    const enviar = vi.fn<EnviarSerie>(async () => {
      throw new ApiError(409, 'training_session_not_in_progress');
    });
    const { result } = render(enviar, onSesionCerrada);

    act(() => {
      result.current.encolar(1, VALORES);
    });

    await waitFor(() => {
      expect(onSesionCerrada).toHaveBeenCalledWith(
        'training_session_not_in_progress',
      );
    });
    // Sale de la cola: insistir no la va a reabrir.
    expect(result.current.pendientes).toHaveLength(0);
  });

  it('un 4xx no se reintenta indefinidamente', async () => {
    const enviar = vi.fn<EnviarSerie>(async () => {
      throw new ApiError(400, 'invalid_request_body');
    });
    const { result } = render(enviar);

    act(() => {
      result.current.encolar(1, VALORES);
    });

    await waitFor(() => {
      expect(result.current.pendientes).toHaveLength(0);
    });
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('cuenta los intentos fallidos de red', async () => {
    const enviar = vi.fn<EnviarSerie>(async () => {
      throw new TypeError('Failed to fetch');
    });
    const { result } = render(enviar);

    act(() => {
      result.current.encolar(1, VALORES);
    });
    await waitFor(() => {
      expect(result.current.pendientes[0]?.intentos).toBe(1);
    });

    act(() => {
      result.current.sincronizar();
    });
    await waitFor(() => {
      expect(result.current.pendientes[0]?.intentos).toBe(2);
    });
  });

  it('corta la pasada ante un fallo de red y conserva el resto', async () => {
    const enviar = vi.fn<EnviarSerie>(async (position) => {
      if (position === 1) throw new TypeError('Failed to fetch');
    });
    const { result } = render(enviar);

    act(() => {
      result.current.encolar(1, VALORES);
      result.current.encolar(2, VALORES);
    });

    await waitFor(() => {
      expect(result.current.pendientes.length).toBeGreaterThan(0);
    });
    expect(result.current.pendientes.map((p) => p.position)).toContain(2);
  });

  it('confirmar quita la serie de la cola', async () => {
    const enviar = vi.fn<EnviarSerie>(() => new Promise<void>(() => {}));
    const { result } = render(enviar);

    act(() => {
      result.current.encolar(3, VALORES);
    });
    expect(result.current.pendientes).toHaveLength(1);

    act(() => {
      result.current.confirmar(3);
    });

    expect(result.current.pendientes).toHaveLength(0);
  });

  it('sin nada pendiente no intenta enviar', () => {
    const enviar = vi.fn<EnviarSerie>(async () => {});
    const { result } = render(enviar);

    act(() => {
      result.current.sincronizar();
    });

    expect(enviar).not.toHaveBeenCalled();
  });
});
