import type { BodyMeasurementInput } from '../../shared/schemas/bodyMeasurement';

export interface BlockedStudentInfo {
  bloqueado: boolean;
  motivoBloqueo?: string;
  /** Fecha (ISO) de la última medición registrada, para mostrar en la ficha. */
  fechaUltimaMedicion?: string;
}

export type PendingMeasurement = BodyMeasurementInput;
