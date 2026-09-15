/**
 * Vista de revisión de una propuesta de adaptación (HU04). El flag y su
 * detalle llegan en el payload que expone HU04-T1 (no implementado aquí).
 */
export interface AdaptationProposalReview {
  id: string;
  /** true si la propuesta se generó sin medición posterior al inicio del ciclo (HU03). */
  sinDatosActualizados: boolean;
  /** Dato faltante declarado por el sistema al generar sin datos actualizados. */
  datoFaltante?: string;
}
