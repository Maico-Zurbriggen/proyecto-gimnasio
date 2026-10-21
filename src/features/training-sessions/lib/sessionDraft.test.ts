import { describe, expect, it, beforeEach } from 'vitest';

import type { TrainingSession } from '../../../api/trainingSessions';
import {
  clearSessionDraft,
  draftKey,
  mergeDraftIntoSession,
  readSessionDraft,
  writeSessionDraft,
} from './sessionDraft';

function baseSession(): TrainingSession {
  return {
    id: 'sesion-1',
    studentId: 'alumno-1',
    routineId: 'rutina-1',
    routineVersionId: 'version-1',
    routineDayId: 'dia-1',
    routineDayName: 'Día 1',
    routineDayPosition: 1,
    state: 'EN_CURSO',
    startedAt: new Date().toISOString(),
    completedAt: null,
    occurredOn: '2026-09-08',
    lastActivityAt: new Date().toISOString(),
    aptitudeWarning: null,
    compatibilityWarnings: [],
    setRecords: [
      {
        position: 1,
        prescribedExerciseId: 'ej-1',
        prescribedExerciseName: 'Sentadilla',
        performedExerciseId: null,
        performedExerciseName: null,
        prescribedMinRepetitions: 6,
        prescribedMaxRepetitions: 12,
        prescribedLoad: 20,
        warmup: false,
        performedLoad: null,
        performedRepetitions: null,
        perceivedEffort: null,
        completed: false,
        additional: false,
        omissionReason: null,
        atypicalConfirmed: false,
      },
    ],
  };
}

describe('sessionDraft (CB-25, FL-07)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('conserva el borrador local para retomar en el punto exacto', () => {
    writeSessionDraft({
      sessionId: 'sesion-1',
      studentId: 'alumno-1',
      updatedAt: new Date().toISOString(),
      paused: true,
      values: {
        1: {
          performedLoad: 22.5,
          performedRepetitions: 10,
          perceivedEffort: 7,
          completed: true,
        },
      },
    });

    const draft = readSessionDraft('alumno-1', 'sesion-1');
    expect(draft?.paused).toBe(true);
    expect(draft?.values[1]?.performedLoad).toBe(22.5);
    expect(
      localStorage.getItem(draftKey('alumno-1', 'sesion-1')),
    ).not.toBeNull();
  });

  it('el servidor gana en la fusión; el borrador sólo completa vacíos', () => {
    const session = baseSession();
    session.setRecords[0]!.performedLoad = 30;
    const merged = mergeDraftIntoSession(session, {
      sessionId: 'sesion-1',
      studentId: 'alumno-1',
      updatedAt: new Date().toISOString(),
      paused: true,
      values: {
        1: {
          performedLoad: 22.5,
          performedRepetitions: 10,
          perceivedEffort: 7,
          completed: true,
        },
      },
    });
    // El valor del servidor (30) no se pisa con el borrador (22.5).
    expect(merged.setRecords[0]?.performedLoad).toBe(30);
    // Los vacíos sí se completan desde el borrador.
    expect(merged.setRecords[0]?.performedRepetitions).toBe(10);
  });

  it('limpia el borrador al cerrar sin perder el hilo previo', () => {
    writeSessionDraft({
      sessionId: 'sesion-1',
      studentId: 'alumno-1',
      updatedAt: new Date().toISOString(),
      paused: false,
      values: {},
    });
    clearSessionDraft('alumno-1', 'sesion-1');
    expect(readSessionDraft('alumno-1', 'sesion-1')).toBeNull();
  });
});
