import { Link } from 'react-router-dom';

export type InvitationErrorType =
  | 'invitation_expired'
  | 'invitation_already_used'
  | 'invitation_revoked'
  | 'invitation_not_found'
  | 'generic_error';

export interface InvitationStatusCardProps {
  type: InvitationErrorType;
  /** Mensaje del backend, si vino. Reemplaza al texto por defecto. */
  customMessage?: string | null;
}

/**
 * Motivo por el que una invitación no sirve (HU06-T6).
 *
 * Los cuatro estados se distinguen porque cada uno lleva a una acción distinta:
 * pedir otra invitación, iniciar sesión, hablar con administración o revisar el
 * enlace. Un mensaje único dejaría a la persona sin saber qué hacer.
 */
const ESTADOS: Record<
  InvitationErrorType,
  { titulo: string; descripcion: string; conLinkDeIngreso?: boolean }
> = {
  invitation_expired: {
    titulo: 'La invitación venció',
    descripcion:
      'Pedile a tu entrenador o al gimnasio que te envíe una invitación nueva.',
  },
  invitation_already_used: {
    titulo: 'Esta invitación ya se usó',
    descripcion: 'La cuenta ya está creada: podés iniciar sesión con ella.',
    conLinkDeIngreso: true,
  },
  invitation_revoked: {
    titulo: 'La invitación fue dada de baja',
    descripcion:
      'El gimnasio canceló esta invitación. Contactate con administración para regularizar tu acceso.',
  },
  invitation_not_found: {
    titulo: 'El enlace no es válido',
    descripcion:
      'Revisá que la dirección sea igual a la que recibiste, sin recortes.',
  },
  generic_error: {
    titulo: 'No pudimos verificar la invitación',
    descripcion: 'Fue un problema momentáneo. Probá de nuevo en unos minutos.',
  },
};

export function InvitationStatusCard({
  type,
  customMessage,
}: InvitationStatusCardProps) {
  const estado = ESTADOS[type];

  return (
    <div
      data-testid={`invitation-status-${type}`}
      className="flex flex-col gap-3 rounded-2xl border border-[#292823]/10 bg-white p-6"
    >
      <p className="eyebrow text-coral-text">Invitación</p>
      <h1 className="font-display text-xl leading-tight font-black tracking-[-0.03em]">
        {estado.titulo}
      </h1>
      <p className="text-sm font-medium text-[#55534c]">
        {customMessage ?? estado.descripcion}
      </p>

      <Link
        to="/ingresar"
        className="bg-graphite mt-2 self-start rounded-full px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
      >
        {estado.conLinkDeIngreso ? 'Iniciar sesión' : 'Ir al inicio de sesión'}
      </Link>
    </div>
  );
}
