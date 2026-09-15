/**
 * Advertencia de datos desactualizados de una propuesta de adaptación (HU04).
 * Mismo formato que `AdvertenciaDatosDesactualizadosDto` del backend (HU04-T1);
 * la ruta que expone el payload de revisión todavía no existe.
 */
export interface AdaptationProposalReview {
  id: string;
  /** `true` cuando la propuesta se generó sin medición nueva en el ciclo (HU03). */
  sinDatosActualizados: boolean;
  /** Qué dato faltó, tal como lo declara el backend (HU03, Esc. 2). */
  datoFaltante?: string;
  /** Faltas consecutivas del alumno, incluida la de esta propuesta. */
  faltasConsecutivas: number;
  /** `true` cuando el alumno alcanzó el tope que habilita el bloqueo (HU03-T5). */
  alcanzoTopeDeFaltas: boolean;
}
