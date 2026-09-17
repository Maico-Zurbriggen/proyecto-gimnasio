import type { FC } from 'react';
import { Link } from 'react-router-dom';

export type InvitationErrorType =
  | 'invitation_expired'
  | 'invitation_already_used'
  | 'invitation_revoked'
  | 'invitation_not_found'
  | 'generic_error';

interface InvitationStatusCardProps {
  type: InvitationErrorType;
  customMessage?: string;
}

const ERROR_CONFIG: Record<
  InvitationErrorType,
  {
    title: string;
    description: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    showLoginLink?: boolean;
  }
> = {
  invitation_expired: {
    title: 'Invitación vencida',
    description:
      'Esta invitación ha caducado. Por favor, solicita a tu entrenador o al gimnasio que te envíe una nueva invitación.',
    icon: '⏳',
    iconBg: 'rgba(239, 68, 68, 0.15)',
    iconColor: '#ef4444',
  },
  invitation_already_used: {
    title: 'Invitación ya utilizada',
    description:
      'Esta invitación ya fue completada anteriormente. Ya puedes iniciar sesión con tu cuenta.',
    icon: '✅',
    iconBg: 'rgba(59, 130, 246, 0.15)',
    iconColor: '#3b82f6',
    showLoginLink: true,
  },
  invitation_revoked: {
    title: 'Invitación revocada',
    description:
      'Esta invitación fue dada de baja o cancelada por el gimnasio. Contacta a administración para regularizar tu acceso.',
    icon: '🚫',
    iconBg: 'rgba(239, 68, 68, 0.15)',
    iconColor: '#ef4444',
  },
  invitation_not_found: {
    title: 'Enlace no válido',
    description:
      'No se encontró la invitación solicitada. Verifica que la dirección URL copiada sea idéntica a la que recibiste.',
    icon: '🔍',
    iconBg: 'rgba(245, 158, 11, 0.15)',
    iconColor: '#f59e0b',
  },
  generic_error: {
    title: 'No pudimos verificar tu invitación',
    description:
      'Ocurrió un problema temporal al procesar la invitación. Por favor intenta de nuevo en unos minutos.',
    icon: '⚠️',
    iconBg: 'rgba(245, 158, 11, 0.15)',
    iconColor: '#f59e0b',
  },
};

export const InvitationStatusCard: FC<InvitationStatusCardProps> = ({
  type,
  customMessage,
}) => {
  const config = ERROR_CONFIG[type] ?? ERROR_CONFIG.generic_error;

  return (
    <div
      data-testid={`invitation-status-${type}`}
      style={{
        maxWidth: '480px',
        margin: '60px auto',
        padding: '32px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: config.iconBg,
          fontSize: '32px',
          marginBottom: '20px',
        }}
        aria-hidden="true"
      >
        {config.icon}
      </div>

      <h2
        style={{
          margin: '0 0 12px',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#f8fafc',
        }}
      >
        {config.title}
      </h2>

      <p
        style={{
          margin: '0 0 28px',
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          color: '#94a3b8',
        }}
      >
        {customMessage || config.description}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Link
          to="/"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            transition: 'background-color 0.2s ease',
          }}
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
};
