import { useCallback, useEffect, useRef, useState } from 'react';

import {
  clearSessionDraft,
  emptyDraft,
  estaSincronizado,
  loadSessionDraft,
  marcarEnvio,
  registrarSerie,
  saveSessionDraft,
  seriesPendientes,
  type EntradaDeSerie,
  type SerieEnBorrador,
  type SyncSessionDraft,
} from '../lib/sessionDraft';

/** Envía una serie al backend. Resuelve si quedó registrada. */
export type EnviarSerie = (serie: SerieEnBorrador) => Promise<void>;

export interface UseSessionDraftOptions {
  sessionId: string;
  enviarSerie: EnviarSerie;
  /** Inyectable para poder fijar el tiempo en los tests. */
  ahora?: () => Date;
}

export interface UseSessionDraftResult {
  draft: SyncSessionDraft;
  /** Registra o corrige una serie y dispara el envío. */
  registrar: (entrada: EntradaDeSerie) => void;
  /** Reintenta la cola pendiente. Se llama solo al recuperar la conexión. */
  sincronizar: () => void;
  pendientes: SerieEnBorrador[];
  sincronizado: boolean;
  /** `false` cuando el borrador no pudo persistirse (modo privado, cuota). */
  respaldoLocalActivo: boolean;
  /** Descarta el borrador: la sesión terminó y el servidor ya tiene todo. */
  descartar: () => void;
}

/**
 * Borrador local de la sesión con reintento ante pérdida de conexión
 * (HU22 - T4, RNF-10, CB-24).
 *
 * Cada serie que el alumno registra se guarda localmente antes de intentar
 * enviarse, así que una caída de red no pierde nada de lo ingresado. La cola se
 * reintenta cuando el navegador recupera la conexión y cuando la pestaña vuelve
 * a estar visible, porque `online` no siempre dispara al salir de una zona sin
 * señal.
 *
 * El reintento puede ser incondicional porque el backend es idempotente por
 * sesión y orden (RN-60, RNF-13): reenviar una serie ya registrada no la
 * duplica. Esa garantía del servidor es lo que permite que este hook no tenga
 * que razonar sobre si el envío anterior llegó.
 */
export function useSessionDraft({
  sessionId,
  enviarSerie,
  ahora = () => new Date(),
}: UseSessionDraftOptions): UseSessionDraftResult {
  const [draft, setDraft] = useState<SyncSessionDraft>(
    () => loadSessionDraft(sessionId) ?? emptyDraft(sessionId, ahora()),
  );
  const [respaldoLocalActivo, setRespaldoLocalActivo] = useState(true);

  // El envío lee el borrador más reciente sin volverse a crear en cada cambio:
  // si `sincronizar` cambiara de identidad con cada serie, el efecto que lo
  // suscribe a `online` se re-suscribiría todo el tiempo.
  const draftRef = useRef(draft);
  const enviandoRef = useRef(false);
  const enviarRef = useRef(enviarSerie);
  const ahoraRef = useRef(ahora);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    enviarRef.current = enviarSerie;
    ahoraRef.current = ahora;
  }, [enviarSerie, ahora]);

  const actualizar = useCallback(
    (siguiente: SyncSessionDraft) => {
      draftRef.current = siguiente;
      setDraft(siguiente);
      setRespaldoLocalActivo(saveSessionDraft(siguiente));
    },
    [setDraft],
  );

  const sincronizar = useCallback(() => {
    // Una sola pasada a la vez: dos colas en paralelo mandarían la misma serie
    // dos veces. No rompe nada por RN-60, pero es trabajo y batería de más.
    if (enviandoRef.current) return;
    if (seriesPendientes(draftRef.current).length === 0) return;

    enviandoRef.current = true;

    void (async () => {
      try {
        // La cola se reconsulta en cada vuelta en lugar de recorrer una lista
        // tomada al principio: mientras se envía, el alumno sigue registrando
        // series, y ésas entran a esta misma pasada. Si se recorriera la lista
        // inicial, una serie registrada durante el envío quedaría pendiente sin
        // nadie que la reintente, porque su `sincronizar` encuentra el guard
        // tomado y vuelve sin hacer nada.
        let cortadaPorFallo = false;
        while (!cortadaPorFallo) {
          const serie = seriesPendientes(draftRef.current)[0];
          if (serie === undefined) break;

          actualizar(
            marcarEnvio(
              draftRef.current,
              serie.position,
              'ENVIANDO',
              ahoraRef.current(),
            ),
          );

          try {
            await enviarRef.current(serie);
            actualizar(
              marcarEnvio(
                draftRef.current,
                serie.position,
                'CONFIRMADA',
                ahoraRef.current(),
              ),
            );
          } catch {
            actualizar(
              marcarEnvio(
                draftRef.current,
                serie.position,
                'FALLIDA',
                ahoraRef.current(),
              ),
            );
            // Si una serie falla, lo más probable es que la conexión se haya
            // cortado: cortar la pasada evita castigar a las demás con el mismo
            // timeout. Quedan en cola para el próximo reintento.
            cortadaPorFallo = true;
          }
        }
      } finally {
        enviandoRef.current = false;
      }
    })();
  }, [actualizar]);

  const registrar = useCallback(
    (entrada: EntradaDeSerie) => {
      // Primero se guarda, después se intenta enviar: ese orden es la garantía
      // de RNF-10. Si el envío falla, el dato ya está en el dispositivo.
      actualizar(registrarSerie(draftRef.current, entrada, ahoraRef.current()));
      sincronizar();
    },
    [actualizar, sincronizar],
  );

  const descartar = useCallback(() => {
    clearSessionDraft(sessionId);
    actualizar(emptyDraft(sessionId, ahoraRef.current()));
  }, [sessionId, actualizar]);

  // Reintento al recuperar la conexión (CB-24). `visibilitychange` cubre el
  // caso en que el navegador no emite `online` al volver de una zona sin señal.
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

  // Al montar con un borrador recuperado, lo pendiente se reenvía solo: el
  // alumno no tiene que acordarse de apretar nada.
  useEffect(() => {
    sincronizar();
  }, [sincronizar]);

  return {
    draft,
    registrar,
    sincronizar,
    pendientes: seriesPendientes(draft),
    sincronizado: estaSincronizado(draft),
    respaldoLocalActivo,
    descartar,
  };
}
