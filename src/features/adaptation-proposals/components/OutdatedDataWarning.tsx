import { Banner } from '../../../shared/components/Banner';
import type { AdvertenciaDatos } from '../types';

export interface OutdatedDataWarningProps {
  proposal: AdvertenciaDatos;
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

  const { faltasConsecutivas } = proposal;

  return (
    <Banner
      variant={proposal.alcanzoTopeDeFaltas ? 'danger' : 'warning'}
      title="Propuesta generada sin datos actualizados"
    >
      <p>
        No se registró una medición corporal posterior al inicio del ciclo del
        alumno. La propuesta se generó igualmente, pero está basada en datos
        anteriores.
        {proposal.datoFaltante
          ? ` Dato faltante: ${proposal.datoFaltante}.`
          : ''}
      </p>
      <p>
        El alumno lleva {faltasConsecutivas}{' '}
        {faltasConsecutivas === 1 ? 'falta consecutiva' : 'faltas consecutivas'}
        , incluida esta propuesta.
      </p>
      {proposal.alcanzoTopeDeFaltas ? (
        <p className="font-semibold">
          Alcanzó el tope de faltas que habilita el bloqueo del alumno.
        </p>
      ) : null}
    </Banner>
  );
}
