import { Banner } from '../../../shared/components/Banner';
import { useRenewalNotice } from '../hooks/useRenewalNotice';
import type { DiasRestantesRenovacion } from '../types';

export interface RenewalBannerProps {
  studentId: string;
  diasRestantesRenovacion: DiasRestantesRenovacion;
  /** Inyectable para pruebas; por defecto es la fecha actual. */
  today?: Date;
  /** Punto de integración con HU02 (formulario de carga de medidas). */
  onCargarMedicion?: () => void;
}

const TITULOS: Record<'PENDIENTE' | 'VENCE_HOY' | 'VENCIDO', string> = {
  PENDIENTE: 'Tu rutina está por vencer',
  VENCE_HOY: 'Tu rutina vence hoy',
  VENCIDO: 'Tu rutina venció',
};

/** Aviso/banner de renovación de ciclo, descartable salvo cuando ya venció (HU01-T4/T5). */
export function RenewalBanner({
  studentId,
  diasRestantesRenovacion,
  today,
  onCargarMedicion,
}: RenewalBannerProps) {
  const { estado, visible, dismissible, dismiss } = useRenewalNotice({
    studentId,
    diasRestantesRenovacion,
    today,
  });

  if (!visible || estado === 'OCULTO') {
    return null;
  }

  const variant = estado === 'VENCIDO' ? 'danger' : 'warning';

  return (
    <Banner
      variant={variant}
      title={TITULOS[estado]}
      onDismiss={dismissible ? dismiss : undefined}
      actions={
        onCargarMedicion ? (
          <button
            type="button"
            onClick={onCargarMedicion}
            className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
          >
            Cargar medidas
          </button>
        ) : undefined
      }
    >
      {estado === 'PENDIENTE' ? (
        <p>
          Faltan {diasRestantesRenovacion}{' '}
          {diasRestantesRenovacion === 1 ? 'día' : 'días'} para que se cumpla tu
          ciclo. Cargá tu altura y peso actualizados para que tu entrenador
          pueda ajustar tu rutina a tiempo.
        </p>
      ) : null}
      {estado === 'VENCE_HOY' ? (
        <p>
          Hoy se cumple tu ciclo de entrenamiento. Cargá tu altura y peso
          actualizados para que se pueda generar la propuesta de ajuste.
        </p>
      ) : null}
      {estado === 'VENCIDO' ? (
        <p>
          Tu ciclo ya venció. Este aviso se mantiene visible hasta que se genere
          tu nueva rutina.
        </p>
      ) : null}
    </Banner>
  );
}
