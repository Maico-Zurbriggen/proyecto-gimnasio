/**
 * Campo derivado expuesto por el endpoint de rutina vigente (HU01-T2, no
 * implementado en esta tarea). Nunca se persiste: se recalcula en cada
 * consulta a partir de la fecha de inicio del ciclo y `duracionCicloDias`.
 */
export type DiasRestantesRenovacion = number;

export type EstadoAvisoRenovacion =
  'OCULTO' | 'PENDIENTE' | 'VENCE_HOY' | 'VENCIDO';
