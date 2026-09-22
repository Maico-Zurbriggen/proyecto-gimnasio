import { useMutation, useQuery } from '@tanstack/react-query';

import {
  TERMINAL_GENERATION_STATES,
  fetchGeneration,
  fetchLatestGeneration,
  requestRoutineGeneration,
} from '../../../api/routine-generations';

export const generationQueryKey = (studentId: string, requestId: string) =>
  ['routine-generations', studentId, requestId] as const;

export const latestGenerationQueryKey = (studentId: string) =>
  ['routine-generations', studentId, 'latest'] as const;

function storageKey(studentId: string): string {
  return `routine-generations:active:${studentId}`;
}

/**
 * Identificador de la generación activa, conservado localmente para
 * recuperarla tras recargar. Todo acceso tolera la falta de almacenamiento.
 */
export function loadActiveGenerationId(studentId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(studentId));
  } catch {
    return null;
  }
}

export function saveActiveGenerationId(
  studentId: string,
  requestId: string,
): void {
  try {
    window.localStorage.setItem(storageKey(studentId), requestId);
  } catch {
    // Sin almacenamiento la solicitud sigue; solo se pierde la recuperación.
  }
}

export function clearActiveGenerationId(studentId: string): void {
  try {
    window.localStorage.removeItem(storageKey(studentId));
  } catch {
    // Sin almacenamiento no hay nada que limpiar.
  }
}

/** Solicitud de actualización de rutina del alumno desde su perfil. */
export function useRequestRoutineUpdate(studentId: string) {
  return useMutation({
    mutationFn: (textoLibre: string) =>
      requestRoutineGeneration(studentId, { textoLibre }),
  });
}

/** Recupera la última solicitud cuando se perdió el estado local del POST. */
export function useLatestGeneration(studentId: string, enabled: boolean) {
  return useQuery({
    queryKey: latestGenerationQueryKey(studentId),
    queryFn: ({ signal }) => fetchLatestGeneration(studentId, signal),
    enabled,
    retry: false,
  });
}

/**
 * Estado de una solicitud con polling hasta el estado terminal. Nunca se
 * mantiene una petición abierta esperando al LLM.
 */
export function useGenerationStatus(
  studentId: string,
  requestId: string | null,
  pollIntervalMs = 4000,
) {
  return useQuery({
    queryKey: generationQueryKey(studentId, requestId ?? 'none'),
    queryFn: ({ signal }) => {
      if (requestId === null) {
        throw new Error('missing generation request id');
      }
      return fetchGeneration(studentId, requestId, signal);
    },
    enabled: requestId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status !== undefined && TERMINAL_GENERATION_STATES.has(status)
        ? false
        : pollIntervalMs;
    },
  });
}
