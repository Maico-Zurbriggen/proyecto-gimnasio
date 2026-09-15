import { Banner } from '../../../shared/components/Banner';
import { useRenewalNotice } from '../hooks/useRenewalNotice';
import type { AvisoRenovacion, EstadoAvisoRenovacion } from '../types';

export interface RenewalBannerProps {
  studentId: string;
  /** `avisoRenovacion` de `GET /routines/active`. */
  aviso: Pick<AvisoRenovacion, 'estado' | 'diasRestantes'>;
  /** Inyectable para pruebas; por defecto es la fecha actual. */
  today?: Date;
  /** Punto de integración con HU02 (formulario de carga de medidas). */
  onCargarMedicion?: () => void;
}

const TITULOS: Record<EstadoAvisoRenovacion, string> = {
  pendiente: 'Tu rutina está por vencer',
  'cerrado hoy': 'Tu rutina vence hoy',
  vencido: 'Tu rutina venció',
};

/** Aviso/banner de renovación de ciclo, descartable salvo cuando ya venció (HU01-T4/T5). */
export function RenewalBanner({
  studentId,
  aviso,
  today,
  onCargarMedicion,
}: RenewalBannerProps) {
  const { visible, dismissible, dismiss } = useRenewalNotice({
    studentId,
    aviso,
    today,
  });

  if (!visible) {
    return null;
  }

  const { estado, diasRestantes } = aviso;

  return (
    <Banner
      variant={estado === 'vencido' ? 'danger' : 'warning'}
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
      {estado === 'pendiente' ? (
        <p>
          Faltan {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'} para que
          se cumpla tu ciclo. Cargá tu altura y peso actualizados para que tu
          entrenador pueda ajustar tu rutina a tiempo.
        </p>
      ) : null}
      {estado === 'cerrado hoy' ? (
        <p>
          Hoy se cumple tu ciclo de entrenamiento. Cargá tu altura y peso
          actualizados para que se pueda generar la propuesta de ajuste.
        </p>
      ) : null}
      {estado === 'vencido' ? (
        <p>
          Tu ciclo ya venció. Este aviso se mantiene visible hasta que se genere
          tu nueva rutina.
        </p>
      ) : null}
    </Banner>
  );
}
