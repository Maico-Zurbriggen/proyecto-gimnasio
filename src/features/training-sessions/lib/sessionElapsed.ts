/**
 * Cronómetro de la sesión (FL-05, FL-07).
 *
 * El tiempo es local y nunca transiciona la sesión en el backend: pausar
 * congela el contador y el tramo en pausa no suma al total.
 */
export function formatElapsed(
  startedAt: string,
  nowMs: number,
  paused: boolean,
  pausedMs = 0,
): string {
  const frozen = Math.max(0, nowMs - new Date(startedAt).getTime() - pausedMs);
  const minutes = Math.floor(frozen / 60_000);
  const seconds = Math.floor((frozen % 60_000) / 1000);
  const text = `${minutes} min ${seconds.toString().padStart(2, '0')} s`;
  return paused ? `${text} (en pausa)` : text;
}

/** Duración cerrada entre dos instantes ISO (para el historial). */
export function formatDuration(
  startedAt: string,
  completedAt: string | null,
): string | null {
  if (!completedAt) return null;
  const ms = Math.max(
    0,
    new Date(completedAt).getTime() - new Date(startedAt).getTime(),
  );
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h ${rest.toString().padStart(2, '0')} min`;
}
