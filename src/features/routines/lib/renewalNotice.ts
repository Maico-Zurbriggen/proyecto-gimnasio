import type { EstadoAvisoRenovacion } from '../types';

/** Días de antelación del aviso; mismo valor que `DIAS_ANTELACION_AVISO` del backend (HU01-T6). */
export const DIAS_ANTELACION_AVISO = 7;

/**
 * Si corresponde mostrar el aviso (HU01, escenarios 1 a 4). El backend no lo
 * expone porque es regla de frontend (HU01-T4): se muestra con 7 días o menos,
 * incluido el día del vencimiento y todos los posteriores.
 */
export function debeMostrarAviso(diasRestantes: number): boolean {
  return diasRestantes <= DIAS_ANTELACION_AVISO;
}

/** Un aviso vencido no se descarta (HU01, escenario 4); `pendiente` y `cerrado hoy` sí. */
export function esDescartable(estado: EstadoAvisoRenovacion): boolean {
  return estado !== 'vencido';
}
