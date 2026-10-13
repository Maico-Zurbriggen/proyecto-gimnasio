import type { PendingRoutineReview } from '../../../api/prescriptions';

/** Cómo llegó la rutina a la bandeja, en palabras del entrenador (HU17). */
export function originLabel(
  review: Pick<
    PendingRoutineReview,
    'origin' | 'requestedByStudent' | 'requestedByName'
  >,
): string {
  if (review.origin === 'GENERADA') {
    return review.requestedByStudent
      ? 'Generada a pedido del alumno'
      : `Generada a pedido de ${review.requestedByName ?? 'su entrenador'}`;
  }
  return `Asignada desde plantilla por ${review.requestedByName ?? 'un entrenador'}`;
}
