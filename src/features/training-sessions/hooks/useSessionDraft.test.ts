import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadSessionDraft,
  saveSessionDraft,
  type SerieEnBorrador,
} from '../lib/sessionDraft';
import { useSessionDraft, type EnviarSerie } from './useSessionDraft';

const SESION = '50000000-0000-4000-8000-000000000001';
const AHORA = new Date('2026-10-21T18:30:00.000Z');

function entrada(position = 1, carga = 80) {
  return {
    position,
    carga,
    repeticiones: 10,
    esfuerzoPercibido: 7,
    completada: true,
    motivoDeOmision: null,
    atipicoConfirmado: false,
  };
}

function render(enviarSerie: EnviarSerie) {
  return renderHook(() =>
    useSessionDraft({ sessionId: SESION, enviarSerie, ahora: () => AHORA }),
  );
}

describe('useSessionDraft', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('RNF-10: guarda la serie localmente antes de enviarla', async () => {
    // El envío nunca resuelve: simula la red del gimnasio colgada.
    const enviar = vi.fn<EnviarSerie>(() => new Promise<void>(() => {}));
    const { result } = render(enviar);

    act(() => {
      result.current.registrar(entrada());
    });

    // El dato ya está en el dispositivo aunque el envío siga en el aire.
    expect(loadSessionDraft(SESION)?.series[0]?.carga).toBe(80);
  });

  it('confirma la serie cuando el envío responde bien', async () => {
    const enviar = vi.fn<EnviarSerie>(async () => {});
    const { result } = render(enviar);

    act(() => {
      result.current.registrar(entrada());
    });

    await waitFor(() => {
      expect(result.current.sincronizado).toBe(true);
    });
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(result.current.pendientes).toHaveLength(0);
  });

  it('la serie queda pendiente cuando el envío falla', async () => {
    const enviar = vi.fn<EnviarSerie>(async () => {
      throw new Error('Failed to fetch');
    });
    const { result } = render(enviar);

    act(() => {
      result.current.registrar(entrada());
    });

    await waitFor(() => {
      expect(result.current.pendientes).toHaveLength(1);
    });
    expect(result.current.sincronizado).toBe(false);
    expect(result.current.draft.series[0]?.intentos).toBe(1);
  });

  it('CB-24: reintenta la cola cuando vuelve la conexión', async () => {
    let red = false;
    const enviar = vi.fn<EnviarSerie>(async () => {
      if (!red) throw new Error('Failed to fetch');
    });
    const { result } = render(enviar);

    act(() => {
      result.current.registrar(entrada());
    });
    await waitFor(() => {
      expect(result.current.pendientes).toHaveLength(1);
    });

    red = true;
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.sincronizado).toBe(true);
    });
  });

  it('reintenta cuando la pestaña vuelve al frente', async () => {
    // Volviendo de una zona sin señal el navegador no siempre emite `online`.
    let red = false;
    const enviar = vi.fn<EnviarSerie>(async () => {
      if (!red) throw new Error('Failed to fetch');
    });
    const { result } = render(enviar);

    act(() => {
      result.current.registrar(entrada());
    });
    await waitFor(() => {
      expect(result.current.pendientes).toHaveLength(1);
    });

    red = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(result.current.sincronizado).toBe(true);
    });
  });

  it('RNF-10: al montar reenvía lo que había quedado pendiente', async () => {
    // Lo que deja una sesión que se cortó: una serie sin confirmar.
    saveSessionDraft({
      sessionId: SESION,
      series: [
        {
          ...entrada(1, 95),
          estado: 'FALLIDA',
          registradaEl: AHORA.toISOString(),
          intentos: 2,
        } as SerieEnBorrador,
      ],
      actualizadoEl: AHORA.toISOString(),
    });

    const enviar = vi.fn<EnviarSerie>(async () => {});
    const { result } = render(enviar);

    // Sin que el alumno apriete nada.
    await waitFor(() => {
      expect(result.current.sincronizado).toBe(true);
    });
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({ position: 1, carga: 95 }),
    );
  });

  it('RN-60: registrar dos veces la misma serie no genera dos registros', async () => {
    const enviar = vi.fn<EnviarSerie>(async () => {});
    const { result } = render(enviar);

    act(() => {
      result.current.registrar(entrada(1, 80));
    });
    await waitFor(() => {
      expect(result.current.sincronizado).toBe(true);
    });

    act(() => {
      result.current.registrar(entrada(1, 85));
    });
    await waitFor(() => {
      expect(result.current.sincronizado).toBe(true);
    });

    // Dos envíos —la corrección también se manda—, pero una sola serie: el
    // servidor sobrescribe el registro de esa posición.
    expect(result.current.draft.series).toHaveLength(1);
    expect(result.current.draft.series[0]?.carga).toBe(85);
  });

  it('envía la cola en orden de ejecución', async () => {
    const enviadas: number[] = [];
    const enviar = vi.fn<EnviarSerie>(async (serie) => {
      enviadas.push(serie.position);
    });
    const { result } = render(enviar);

    act(() => {
      result.current.registrar(entrada(2));
    });
    act(() => {
      result.current.registrar(entrada(1));
    });

    await waitFor(() => {
      expect(result.current.sincronizado).toBe(true);
    });
    expect(enviadas).toEqual([2, 1]);
  });

  it('una serie registrada mientras se envía otra no queda olvidada', async () => {
    // Caso real: el alumno registra la serie siguiente antes de que termine el
    // envío de la anterior, que es lo normal con la red del gimnasio. La cola
    // se reconsulta en cada vuelta, así que la segunda entra a la pasada en
    // curso en lugar de esperar un evento de reconexión que quizá no llegue.
    let liberar: (() => void) | undefined;
    const enviar = vi.fn<EnviarSerie>(
      (serie) =>
        new Promise<void>((resolve) => {
          if (serie.position === 1) liberar = resolve;
          else resolve();
        }),
    );
    const { result } = render(enviar);

    act(() => {
      result.current.registrar(entrada(1));
    });
    await waitFor(() => {
      expect(enviar).toHaveBeenCalledTimes(1);
    });

    // Entra la segunda con el envío de la primera todavía en el aire.
    act(() => {
      result.current.registrar(entrada(2));
    });
    act(() => {
      liberar?.();
    });

    await waitFor(() => {
      expect(result.current.sincronizado).toBe(true);
    });
    expect(enviar).toHaveBeenCalledTimes(2);
  });

  it('corta la pasada ante un fallo y conserva el resto en cola', async () => {
    const enviar = vi.fn<EnviarSerie>(async (serie) => {
      if (serie.position === 1) throw new Error('Failed to fetch');
    });
    const { result } = render(enviar);

    act(() => {
      result.current.registrar(entrada(1));
    });
    act(() => {
      result.current.registrar(entrada(2));
    });

    await waitFor(() => {
      expect(result.current.pendientes.length).toBeGreaterThan(0);
    });

    // La 2 no se descarta por el fallo de la 1: queda para el próximo intento.
    expect(result.current.pendientes.map((s) => s.position)).toContain(2);
  });

  it('advierte cuando el respaldo local no está disponible', async () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

    try {
      const enviar = vi.fn<EnviarSerie>(async () => {});
      const { result } = render(enviar);

      act(() => {
        result.current.registrar(entrada());
      });

      // La pantalla puede avisar que lo ingresado no sobrevive a un cierre.
      await waitFor(() => {
        expect(result.current.respaldoLocalActivo).toBe(false);
      });
    } finally {
      setItem.mockRestore();
    }
  });

  it('descartar limpia el borrador al cerrarse la sesión', async () => {
    const enviar = vi.fn<EnviarSerie>(async () => {});
    const { result } = render(enviar);

    act(() => {
      result.current.registrar(entrada());
    });
    await waitFor(() => {
      expect(result.current.sincronizado).toBe(true);
    });

    act(() => {
      result.current.descartar();
    });

    expect(result.current.draft.series).toHaveLength(0);
    expect(loadSessionDraft(SESION)?.series ?? []).toHaveLength(0);
  });
});
