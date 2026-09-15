import type { DiasRestantesRenovacion, EstadoAvisoRenovacion } from '../types';

const UMBRAL_AVISO_DIAS = 7;

/**
 * Deriva el estado del aviso de renovación a partir de los días restantes
 * (HU01, escenarios 1 a 4). Función pura: no conoce fechas de ciclo ni
 * duración, solo el campo ya derivado que expone el endpoint.
 */
export function calcularEstadoAvisoRenovacion(
  diasRestantesRenovacion: DiasRestantesRenovacion,
): EstadoAvisoRenovacion {
  if (diasRestantesRenovacion > UMBRAL_AVISO_DIAS) {
    return 'OCULTO';
  }
  if (diasRestantesRenovacion === 0) {
    return 'VENCE_HOY';
  }
  if (diasRestantesRenovacion < 0) {
    return 'VENCIDO';
  }
  return 'PENDIENTE';
}

/** El aviso vencido no puede descartarse (HU01, escenario 4). */
export function esDescartable(estado: EstadoAvisoRenovacion): boolean {
  return estado === 'PENDIENTE' || estado === 'VENCE_HOY';
}
