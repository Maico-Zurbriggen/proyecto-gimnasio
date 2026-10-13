import { Link } from 'react-router-dom';

export type InvitationErrorType =
  | 'invitation_expired'
  | 'invitation_already_used'
  | 'invitation_revoked'
  | 'invitation_not_found';

export interface InvitationStatusCardProps {
  type: InvitationErrorType;
}

/**
 * Motivo por el que una invitación no sirve (HU06-T6).
 *
 * Los cuatro mensajes son distintos porque cada uno lleva a una acción distinta:
 * pedir otra invitación, iniciar sesión, hablar con el gimnasio o revisar el
 * enlace. Ninguno muestra el formulario ni detalles técnicos (criterios 11 a 15).
 */
const ESTADOS: Record<
  InvitationErrorType,
  { titulo: string; descripcion: string; conLinkDeIngreso: boolean }
> = {
  invitation_expired: {
    titulo: 'La invitación venció',
    descripcion:
      'Las invitaciones valen 14 días. Pedile al gimnasio que te envíe una nueva.',
    conLinkDeIngreso: false,
  },
  invitation_already_used: {
    titulo: 'Esta invitación ya se usó',
    descripcion:
      'La cuenta ya está creada. Si fuiste vos, ingresá con tu correo y tu contraseña.',
    conLinkDeIngreso: true,
  },
  invitation_revoked: {
    titulo: 'La invitación fue cancelada',
    descripcion:
      'El gimnasio dio de baja esta invitación. Si creés que es un error, consultalo con el gimnasio.',
    conLinkDeIngreso: false,
  },
  invitation_not_found: {
    titulo: 'El enlace no es válido',
    descripcion:
      'Revisá que la dirección sea exactamente la que recibiste por correo, sin recortes.',
    conLinkDeIngreso: false,
  },
};

export function InvitationStatusCard({ type }: InvitationStatusCardProps) {
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
      <p className="text-sm font-medium text-[#55534c]">{estado.descripcion}</p>

      {estado.conLinkDeIngreso ? (
        <Link
          to="/ingresar"
          className="bg-graphite mt-2 self-start rounded-full px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
        >
          Iniciar sesión
        </Link>
      ) : null}
    </div>
  );
}
