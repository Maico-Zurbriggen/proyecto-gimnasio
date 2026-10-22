import type { TrainingSession } from '../../../api/trainingSessions';

/**
 * Borrador local de la sesión activa (CB-25, FL-07, RNF-10).
 *
 * Estrategia de sincronización explícita:
 * - El backend es la fuente de la prescripción congelada y del estado
 *   (EN_CURSO, COMPLETADA, ABANDONADA, BLOQUEADA).
 * - El cliente sólo conserva valores ejecutados aún no confirmados y el
 *   cronómetro local (pausado / en marcha). Pausar nunca transiciona.
 * - Al reanudar se fusiona: el servidor gana para estado y prescripción;
 *   el borrador sólo rellena campos ejecutados vacíos en el servidor.
 * - La clave incluye sesión y alumno para no mezclar borradores.
 */
export interface SessionDraftValue {
  performedLoad: number | null;
  performedRepetitions: number | null;
  perceivedEffort: number | null;
  completed: boolean;
}

export interface SessionDraft {
  sessionId: string;
  studentId: string;
  updatedAt: string;
  paused: boolean;
  values: Record<number, SessionDraftValue>;
}

const DRAFT_VERSION = 'v1';

export function draftKey(studentId: string, sessionId: string): string {
  return `gym.training-session.${DRAFT_VERSION}.${studentId}.${sessionId}`;
}

export function readSessionDraft(
  studentId: string,
  sessionId: string,
): SessionDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(studentId, sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionDraft;
    if (parsed.sessionId !== sessionId || parsed.studentId !== studentId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSessionDraft(draft: SessionDraft): void {
  try {
    localStorage.setItem(
      draftKey(draft.studentId, draft.sessionId),
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // Cuota llena o almacenamiento bloqueado: la sesión sigue en el servidor.
  }
}

export function clearSessionDraft(sessionId: string): void;
export function clearSessionDraft(studentId: string, sessionId: string): void;
export function clearSessionDraft(
  studentIdOrSessionId: string,
  sessionId?: string,
): void {
  try {
    localStorage.removeItem(
      sessionId
        ? draftKey(studentIdOrSessionId, sessionId)
        : syncDraftKey(studentIdOrSessionId),
    );
  } catch {
    // Ignorar: no debe bloquear el cierre de la sesión.
  }
}

/** Estado de sincronización de una serie guardada antes de enviarla. */
export type EstadoDeEnvio = 'PENDIENTE' | 'ENVIANDO' | 'CONFIRMADA' | 'FALLIDA';

export interface SerieEnBorrador {
  position: number;
  carga: number | null;
  repeticiones: number | null;
  esfuerzoPercibido: number | null;
  completada: boolean;
  motivoDeOmision: string | null;
  atipicoConfirmado: boolean;
  estado: EstadoDeEnvio;
  registradaEl: string;
  intentos: number;
}

/** Cola offline incorporada desde HU22; convive con el borrador de la vista activa. */
export interface SyncSessionDraft {
  sessionId: string;
  series: SerieEnBorrador[];
  actualizadoEl: string;
}

export type EntradaDeSerie = Omit<
  SerieEnBorrador,
  'estado' | 'registradaEl' | 'intentos'
>;

const SYNC_DRAFT_PREFIX = 'gym:session-draft:';
const ESTADOS_DE_ENVIO: EstadoDeEnvio[] = [
  'PENDIENTE',
  'ENVIANDO',
  'CONFIRMADA',
  'FALLIDA',
];

function syncDraftKey(sessionId: string): string {
  return `${SYNC_DRAFT_PREFIX}${sessionId}`;
}

function numeroOrNull(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

function ordenarPorPosicion(series: SerieEnBorrador[]): SerieEnBorrador[] {
  return [...series].sort((a, b) => a.position - b.position);
}

function parseSerie(valor: unknown): SerieEnBorrador | null {
  if (typeof valor !== 'object' || valor === null) return null;
  if (!('position' in valor) || typeof valor.position !== 'number') return null;
  if (!Number.isInteger(valor.position) || valor.position < 1) return null;

  const estadoLeido =
    'estado' in valor &&
    typeof valor.estado === 'string' &&
    ESTADOS_DE_ENVIO.includes(valor.estado as EstadoDeEnvio)
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

export function loadSessionDraft(sessionId: string): SyncSessionDraft | null {
  try {
    const raw = localStorage.getItem(syncDraftKey(sessionId));
    if (!raw) return null;
    const valor: unknown = JSON.parse(raw);
    if (
      typeof valor !== 'object' ||
      valor === null ||
      !('series' in valor) ||
      !Array.isArray(valor.series)
    ) {
      localStorage.removeItem(syncDraftKey(sessionId));
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
      localStorage.removeItem(syncDraftKey(sessionId));
    } catch {
      // El almacenamiento no está disponible.
    }
    return null;
  }
}

export function saveSessionDraft(draft: SyncSessionDraft): boolean {
  try {
    localStorage.setItem(syncDraftKey(draft.sessionId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function emptyDraft(sessionId: string, ahora: Date): SyncSessionDraft {
  return { sessionId, series: [], actualizadoEl: ahora.toISOString() };
}

export function registrarSerie(
  draft: SyncSessionDraft,
  entrada: EntradaDeSerie,
  ahora: Date,
): SyncSessionDraft {
  const resto = draft.series.filter(
    (serie) => serie.position !== entrada.position,
  );
  return {
    ...draft,
    series: ordenarPorPosicion([
      ...resto,
      {
        ...entrada,
        estado: 'PENDIENTE',
        registradaEl: ahora.toISOString(),
        intentos: 0,
      },
    ]),
    actualizadoEl: ahora.toISOString(),
  };
}

export function seriesPendientes(draft: SyncSessionDraft): SerieEnBorrador[] {
  return draft.series.filter(
    (serie) => serie.estado === 'PENDIENTE' || serie.estado === 'FALLIDA',
  );
}

export function marcarEnvio(
  draft: SyncSessionDraft,
  position: number,
  resultado: 'ENVIANDO' | 'CONFIRMADA' | 'FALLIDA',
  ahora: Date,
): SyncSessionDraft {
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

export function estaSincronizado(draft: SyncSessionDraft): boolean {
  return draft.series.every((serie) => serie.estado === 'CONFIRMADA');
}

/** Fusión explícita: el servidor gana; el borrador sólo completa vacíos. */
export function mergeDraftIntoSession(
  session: TrainingSession,
  draft: SessionDraft | null,
): TrainingSession {
  if (!draft || draft.sessionId !== session.id) return session;
  return {
    ...session,
    setRecords: session.setRecords.map((record) => {
      const local = draft.values[record.position];
      if (!local) return record;
      return {
        ...record,
        performedLoad: record.performedLoad ?? local.performedLoad,
        performedRepetitions:
          record.performedRepetitions ?? local.performedRepetitions,
        perceivedEffort: record.perceivedEffort ?? local.perceivedEffort,
        completed: record.completed || local.completed,
      };
    }),
  };
}
