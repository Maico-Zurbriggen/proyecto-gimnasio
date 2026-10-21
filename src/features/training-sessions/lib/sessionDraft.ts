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

export function clearSessionDraft(studentId: string, sessionId: string): void {
  try {
    localStorage.removeItem(draftKey(studentId, sessionId));
  } catch {
    // Ignorar: no debe bloquear el cierre de la sesión.
  }
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
