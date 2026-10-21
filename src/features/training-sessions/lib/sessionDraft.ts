/**
 * Borrador local de la sesión en curso (HU22 - T4, RNF-10, CB-24).
 *
 * La pantalla de sesión es la de mayor riesgo del proyecto (R-05): se usa de
 * pie, entre series, con una mano, y con la conexión del gimnasio. RNF-10 pide
 * que ningún dato ingresado se pierda ante una pérdida de conexión, y CB-24
 * agrega que al recuperarla se sincronice **sin duplicar**.
 *
 * El borrador vive en `localStorage` y no en memoria porque E2 de FL-05 admite
 * que el alumno cierre la aplicación: al volver, la sesión sigue EN_CURSO y se
 * retoma en el punto en que quedó (FL-07).
 *
 * La no duplicación la garantiza el backend: RN-60 identifica un envío por
 * sesión y orden, así que reenviar la misma serie produce un único registro
 * (RNF-13). Por eso acá el reintento puede ser simple —reenviar es barato y
 * seguro—, y la clave del borrador es exactamente el par que RN-60 usa como
 * identidad.
 */

const STORAGE_PREFIX = 'gym:session-draft:';

/** Estado de sincronización de una serie del borrador. */
export type EstadoDeEnvio = 'PENDIENTE' | 'ENVIANDO' | 'CONFIRMADA' | 'FALLIDA';

/** Una serie registrada por el alumno, tal como espera enviarse. */
export interface SerieEnBorrador {
  /** Orden dentro de la sesión: con `sessionId`, su identidad (RN-60). */
  position: number;
  carga: number | null;
  repeticiones: number | null;
  /** Opcional en FL-05 paso 6. */
  esfuerzoPercibido: number | null;
  completada: boolean;
  /** Motivo opcional de una serie omitida (RN-57). */
  motivoDeOmision: string | null;
  /** Confirmación explícita de un valor atípico (RN-55a). */
  atipicoConfirmado: boolean;
  estado: EstadoDeEnvio;
  /** Momento del último registro local, para ordenar y para diagnóstico. */
  registradaEl: string;
  /** Intentos de envío fallidos acumulados. */
  intentos: number;
}

export interface SessionDraft {
  sessionId: string;
  series: SerieEnBorrador[];
  actualizadoEl: string;
}

function storageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId}`;
}

const ESTADOS: string[] = ['PENDIENTE', 'ENVIANDO', 'CONFIRMADA', 'FALLIDA'];

function numeroOrNull(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

function ordenarPorPosicion(series: SerieEnBorrador[]): SerieEnBorrador[] {
  return [...series].sort((a, b) => a.position - b.position);
}

/** Valida una serie leída del almacenamiento; `null` si no es utilizable. */
function parseSerie(valor: unknown): SerieEnBorrador | null {
  if (typeof valor !== 'object' || valor === null) return null;
  if (!('position' in valor) || typeof valor.position !== 'number') return null;
  if (!Number.isInteger(valor.position) || valor.position < 1) return null;

  const estadoLeido =
    'estado' in valor &&
    typeof valor.estado === 'string' &&
    ESTADOS.includes(valor.estado)
      ? (valor.estado as EstadoDeEnvio)
      : 'PENDIENTE';

  return {
    position: valor.position,
    carga: 'carga' in valor ? numeroOrNull(valor.carga) : null,
    repeticiones:
      'repeticiones' in valor ? numeroOrNull(valor.repeticiones) : null,
    esfuerzoPercibido:
      'esfuerzoPercibido' in valor
        ? numeroOrNull(valor.esfuerzoPercibido)
        : null,
    completada: 'completada' in valor && valor.completada === true,
    motivoDeOmision:
      'motivoDeOmision' in valor && typeof valor.motivoDeOmision === 'string'
        ? valor.motivoDeOmision
        : null,
    atipicoConfirmado:
      'atipicoConfirmado' in valor && valor.atipicoConfirmado === true,
    // Una serie que quedó ENVIANDO cuando se cortó la aplicación no está
    // confirmada: vuelve a la cola. Reenviarla es seguro por RN-60.
    estado: estadoLeido === 'ENVIANDO' ? 'PENDIENTE' : estadoLeido,
    registradaEl:
      'registradaEl' in valor && typeof valor.registradaEl === 'string'
        ? valor.registradaEl
        : new Date(0).toISOString(),
    intentos:
      'intentos' in valor &&
      typeof valor.intentos === 'number' &&
      Number.isInteger(valor.intentos) &&
      valor.intentos >= 0
        ? valor.intentos
        : 0,
  };
}

/**
 * Borrador guardado de una sesión. `null` si no hay ninguno.
 *
 * Un borrador ilegible se descarta en lugar de romper la pantalla: perder el
 * borrador es malo, pero dejar al alumno sin poder registrar es peor.
 */
export function loadSessionDraft(sessionId: string): SessionDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    if (!raw) return null;

    const valor: unknown = JSON.parse(raw);
    if (
      typeof valor !== 'object' ||
      valor === null ||
      !('series' in valor) ||
      !Array.isArray(valor.series)
    ) {
      localStorage.removeItem(storageKey(sessionId));
      return null;
    }

    const series = valor.series
      .map((serie: unknown) => parseSerie(serie))
      .filter((serie): serie is SerieEnBorrador => serie !== null);

    return {
      sessionId,
      series: ordenarPorPosicion(series),
      actualizadoEl:
        'actualizadoEl' in valor && typeof valor.actualizadoEl === 'string'
          ? valor.actualizadoEl
          : new Date(0).toISOString(),
    };
  } catch {
    try {
      localStorage.removeItem(storageKey(sessionId));
    } catch {
      // Almacenamiento no disponible: no hay nada que limpiar.
    }
    return null;
  }
}

/**
 * Guarda el borrador.
 *
 * Devuelve `false` si el almacenamiento no está disponible —modo privado, cuota
 * agotada—, para que la pantalla pueda advertir que el respaldo local no está
 * actuando en lugar de prometer una garantía que no tiene.
 */
export function saveSessionDraft(draft: SessionDraft): boolean {
  try {
    localStorage.setItem(storageKey(draft.sessionId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearSessionDraft(sessionId: string): void {
  try {
    localStorage.removeItem(storageKey(sessionId));
  } catch {
    // Nada que hacer: el borrador queda hasta que el navegador lo libere.
  }
}

/** Borrador vacío de una sesión. */
export function emptyDraft(sessionId: string, ahora: Date): SessionDraft {
  return {
    sessionId,
    series: [],
    actualizadoEl: ahora.toISOString(),
  };
}

/** Valores que el alumno ingresa para una serie. */
export type EntradaDeSerie = Omit<
  SerieEnBorrador,
  'estado' | 'registradaEl' | 'intentos'
>;

/**
 * Registra o corrige una serie del borrador.
 *
 * La identidad es `position`: volver a registrar la misma serie la reemplaza en
 * lugar de agregar otra, que es la misma identidad que RN-60 usa del lado del
 * servidor. Así el borrador no puede generar dos envíos para una serie.
 */
export function registrarSerie(
  draft: SessionDraft,
  entrada: EntradaDeSerie,
  ahora: Date,
): SessionDraft {
  const resto = draft.series.filter(
    (serie) => serie.position !== entrada.position,
  );

  return {
    ...draft,
    series: ordenarPorPosicion([
      ...resto,
      {
        ...entrada,
        // Una corrección vuelve a la cola aunque el valor anterior ya estuviera
        // confirmado: el servidor sobrescribe el registro de esa posición.
        estado: 'PENDIENTE',
        registradaEl: ahora.toISOString(),
        intentos: 0,
      },
    ]),
    actualizadoEl: ahora.toISOString(),
  };
}

/** Series que todavía deben enviarse, en orden de ejecución. */
export function seriesPendientes(draft: SessionDraft): SerieEnBorrador[] {
  return draft.series.filter(
    (serie) => serie.estado === 'PENDIENTE' || serie.estado === 'FALLIDA',
  );
}

/** Marca el resultado de un envío. */
export function marcarEnvio(
  draft: SessionDraft,
  position: number,
  resultado: 'ENVIANDO' | 'CONFIRMADA' | 'FALLIDA',
  ahora: Date,
): SessionDraft {
  return {
    ...draft,
    series: draft.series.map((serie) =>
      serie.position === position
        ? {
            ...serie,
            estado: resultado,
            intentos:
              resultado === 'FALLIDA' ? serie.intentos + 1 : serie.intentos,
          }
        : serie,
    ),
    actualizadoEl: ahora.toISOString(),
  };
}

/**
 * `true` cuando todo lo registrado está confirmado por el servidor.
 *
 * Es la condición para dar la sesión por sincronizada; mientras sea `false`,
 * hay trabajo del alumno que sólo existe en su dispositivo.
 */
export function estaSincronizado(draft: SessionDraft): boolean {
  return draft.series.every((serie) => serie.estado === 'CONFIRMADA');
}
