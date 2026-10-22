import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../../../api/client';
import type { UpdateSeriesInput } from '../../../api/trainingSessions';

/** Una serie registrada que todavía no confirmó el servidor. */
export interface SeriePendiente {
  position: number;
  valores: UpdateSeriesInput;
  intentos: number;
}

export type EnviarSerie = (
  position: number,
  valores: UpdateSeriesInput,
) => Promise<void>;

export interface UsePendingSeriesSyncOptions {
  enviarSerie: EnviarSerie;
  /** Se avisa cuando la sesión dejó de admitir registros (criterio 8). */
  onSesionCerrada?: (codigo: string) => void;
}

export interface UsePendingSeriesSyncResult {
  /** Encola una serie cuyo envío falló por falta de conexión. */
  encolar: (position: number, valores: UpdateSeriesInput) => void;
  /** Quita una serie de la cola: el servidor la confirmó por otra vía. */
  confirmar: (position: number) => void;
  pendientes: SeriePendiente[];
  sincronizando: boolean;
  /** Reintento manual, para el botón del indicador. */
  sincronizar: () => void;
}

/**
 * Cola de series pendientes de sincronizar (HU22 - T4, RNF-10, CB-24).
 *
 * El autoguardado de la pantalla reintenta un par de veces y se rinde: con la
 * red de un gimnasio, eso deja el valor sólo en el borrador local, sin nadie
 * que lo vuelva a mandar y sin que el alumno sepa que no llegó. Esta cola toma
 * esos envíos rendidos y los reintenta cuando la conexión vuelve.
 *
 * Reenviar es seguro porque el registro es idempotente por sesión y orden
 * (RN-60, RNF-13): si el envío que se dio por fallido en realidad había
 * llegado, el reintento no duplica nada.
 *
 * Un 4xx no se reintenta: no se arregla insistiendo. Si además la sesión dejó
 * de estar EN_CURSO —se abandonó por inactividad mientras el teléfono estaba
 * sin señal (RN-53)—, se avisa en lugar de reintentar en silencio para
 * siempre, que es lo que pide el criterio 8.
 */
export function usePendingSeriesSync({
  enviarSerie,
  onSesionCerrada,
}: UsePendingSeriesSyncOptions): UsePendingSeriesSyncResult {
  const [pendientes, setPendientes] = useState<SeriePendiente[]>([]);
  const [sincronizando, setSincronizando] = useState(false);

  const pendientesRef = useRef(pendientes);
  const enviandoRef = useRef(false);
  const enviarRef = useRef(enviarSerie);
  const cerradaRef = useRef(onSesionCerrada);

  useEffect(() => {
    pendientesRef.current = pendientes;
  }, [pendientes]);

  useEffect(() => {
    enviarRef.current = enviarSerie;
    cerradaRef.current = onSesionCerrada;
  }, [enviarSerie, onSesionCerrada]);

  const actualizar = useCallback((siguiente: SeriePendiente[]) => {
    pendientesRef.current = siguiente;
    setPendientes(siguiente);
  }, []);

  // `sincronizar` se define más abajo; el ref permite dispararlo al encolar
  // sin reordenar las declaraciones ni crear una dependencia circular.
  const sincronizarRef = useRef<() => void>(() => undefined);

  const encolar = useCallback(
    (position: number, valores: UpdateSeriesInput) => {
      // La identidad es la posición, la misma que usa RN-60 del lado del
      // servidor: volver a encolar la misma serie la reemplaza, no la duplica.
      actualizar([
        ...pendientesRef.current.filter((p) => p.position !== position),
        { position, valores, intentos: 0 },
      ]);
      // Se intenta de inmediato: si la red volvió entre medio, la serie sale
      // sin esperar a un evento de reconexión que quizá ya pasó.
      sincronizarRef.current();
    },
    [actualizar],
  );

  const confirmar = useCallback(
    (position: number) => {
      actualizar(pendientesRef.current.filter((p) => p.position !== position));
    },
    [actualizar],
  );

  const sincronizar = useCallback(() => {
    if (enviandoRef.current) return;
    if (pendientesRef.current.length === 0) return;

    enviandoRef.current = true;
    setSincronizando(true);

    void (async () => {
      try {
        // La cola se reconsulta en cada vuelta: mientras se envía, el alumno
        // sigue registrando series, y ésas entran a esta misma pasada.
        let cortadaPorFallo = false;
        while (!cortadaPorFallo) {
          const serie = pendientesRef.current[0];
          if (serie === undefined) break;

          try {
            await enviarRef.current(serie.position, serie.valores);
            // Si el alumno corrigió la serie mientras se enviaba, el valor en
            // cola ya no es el que acaba de salir: se deja encolada para que
            // la corrección también llegue. Reenviar no duplica (RN-60).
            const enCola = pendientesRef.current.find(
              (p) => p.position === serie.position,
            );
            if (enCola === undefined || enCola.valores === serie.valores) {
              actualizar(
                pendientesRef.current.filter(
                  (p) => p.position !== serie.position,
                ),
              );
            }
          } catch (error) {
            const esDeCliente =
              error instanceof ApiError &&
              error.status >= 400 &&
              error.status < 500;

            if (esDeCliente) {
              // No se arregla reintentando: sale de la cola. Si fue porque la
              // sesión ya no admite registros, hay que decírselo al alumno en
              // lugar de descartar su trabajo en silencio.
              actualizar(
                pendientesRef.current.filter(
                  (p) => p.position !== serie.position,
                ),
              );
              cerradaRef.current?.(
                error instanceof ApiError ? error.code : 'unknown_error',
              );
              continue;
            }

            actualizar(
              pendientesRef.current.map((p) =>
                p.position === serie.position
                  ? { ...p, intentos: p.intentos + 1 }
                  : p,
              ),
            );
            // Lo más probable es que siga sin conexión: cortar la pasada evita
            // castigar a las demás con el mismo tiempo de espera.
            cortadaPorFallo = true;
          }
        }
      } finally {
        enviandoRef.current = false;
        setSincronizando(false);
      }
    })();
  }, [actualizar]);

  useEffect(() => {
    sincronizarRef.current = sincronizar;
  }, [sincronizar]);

  // CB-24: al volver la conexión se vacía la cola. `visibilitychange` cubre el
  // caso en que el navegador no emite `online` al salir de una zona sin señal.
  useEffect(() => {
    const alRecuperar = () => {
      sincronizar();
    };
    const alVolverAlFrente = () => {
      if (document.visibilityState === 'visible') sincronizar();
    };

    window.addEventListener('online', alRecuperar);
    document.addEventListener('visibilitychange', alVolverAlFrente);
    return () => {
      window.removeEventListener('online', alRecuperar);
      document.removeEventListener('visibilitychange', alVolverAlFrente);
    };
  }, [sincronizar]);

  return { encolar, confirmar, pendientes, sincronizando, sincronizar };
}
