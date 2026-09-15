import { Banner } from '../../../shared/components/Banner';
import type { AdaptationProposalReview } from '../types';

export interface OutdatedDataWarningProps {
  proposal: Pick<
    AdaptationProposalReview,
    'sinDatosActualizados' | 'datoFaltante'
  >;
}

/**
 * Advertencia de "datos desactualizados" en la pantalla de revisión del
 * entrenador (HU04-T2, escenarios 1 y 2). Debe quedar visible antes de que
 * el entrenador tome una decisión: se renderiza por encima de las acciones
 * de aprobar/aprobar parcialmente/rechazar.
 */
export function OutdatedDataWarning({ proposal }: OutdatedDataWarningProps) {
  if (!proposal.sinDatosActualizados) {
    return null;
  }

  return (
    <Banner variant="warning" title="Propuesta generada sin datos actualizados">
      <p>
        No se registró una medición corporal posterior al inicio del ciclo del
        alumno. La propuesta se generó igualmente, pero está basada en datos
        anteriores.
        {proposal.datoFaltante
          ? ` Dato faltante: ${proposal.datoFaltante}.`
          : ''}
      </p>
    </Banner>
  );
}
