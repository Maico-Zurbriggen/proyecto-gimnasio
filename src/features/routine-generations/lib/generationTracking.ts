const STORAGE_PREFIX = 'gym:routine-generation:';

export interface GenerationTracking {
  idempotencyKey: string;
  requestId?: string;
}

function storageKey(studentId: string): string {
  return `${STORAGE_PREFIX}${studentId}`;
}

export function loadGenerationTracking(
  studentId: string,
): GenerationTracking | null {
  try {
    const raw = localStorage.getItem(storageKey(studentId));
    if (!raw) return null;

    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== 'object' ||
      value === null ||
      !('idempotencyKey' in value) ||
      typeof value.idempotencyKey !== 'string' ||
      value.idempotencyKey.length === 0
    ) {
      localStorage.removeItem(storageKey(studentId));
      return null;
    }

    const requestId =
      'requestId' in value && typeof value.requestId === 'string'
        ? value.requestId
        : undefined;
    return { idempotencyKey: value.idempotencyKey, requestId };
  } catch {
    localStorage.removeItem(storageKey(studentId));
    return null;
  }
}

export function saveGenerationTracking(
  studentId: string,
  tracking: GenerationTracking,
): void {
  localStorage.setItem(storageKey(studentId), JSON.stringify(tracking));
}

export function clearGenerationTracking(studentId: string): void {
  localStorage.removeItem(storageKey(studentId));
}
