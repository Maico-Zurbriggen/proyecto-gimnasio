import type { BodyMeasurementInput } from '../../shared/schemas/bodyMeasurement';

/** Subconjunto de `StudentStatus` que usan las vistas de bloqueo (HU05-T2). */
export interface BlockedStudentInfo {
  bloqueado: boolean;
  motivoBloqueo?: string | null;
  /** Fecha `YYYY-MM-DD` de la última medición registrada. */
  fechaUltimaMedicion?: string | null;
}

export type PendingMeasurement = BodyMeasurementInput;
