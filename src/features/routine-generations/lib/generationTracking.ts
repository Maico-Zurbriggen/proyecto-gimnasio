const STORAGE_PREFIX = 'gym:routine-generation:';

export interface GenerationTracking {
  idempotencyKey: string;
  inputFingerprint?: string;
  requestId?: string;
  regenerate?: boolean;
}

export async function fingerprintGenerationInput(
  input: string,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
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
    const inputFingerprint =
      'inputFingerprint' in value &&
      typeof value.inputFingerprint === 'string' &&
      /^[a-f0-9]{64}$/.test(value.inputFingerprint)
        ? value.inputFingerprint
        : undefined;
    return {
      idempotencyKey: value.idempotencyKey,
      inputFingerprint,
      requestId,
      regenerate: 'regenerate' in value && value.regenerate === true,
    };
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
