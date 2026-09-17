import { useEffect, useId, useState, type FC, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  completeInvitationAccount,
  getInvitation,
  type ValidatedInvitation,
} from '../../../api/invitations';
import { isApiError } from '../../../api/client';
import {
  InvitationStatusCard,
  type InvitationErrorType,
} from '../components/InvitationStatusCard';
import { PasswordRequirementsList } from '../components/PasswordRequirementsList';
import { isPasswordStrong } from '../utils/passwordStrength';

export const CompleteAccountPage: FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [invitation, setInvitation] = useState<ValidatedInvitation | null>(
    null,
  );
  const [errorType, setErrorType] = useState<InvitationErrorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const nameId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  useEffect(() => {
    if (!token) {
      setErrorType('invitation_not_found');
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsLoading(true);
    setErrorType(null);
    setErrorMessage(null);

    getInvitation(token, abortController.signal)
      .then((data) => {
        setInvitation(data);
      })
      .catch((err: unknown) => {
        if (abortController.signal.aborted) return;

        if (isApiError(err)) {
          if (err.code === 'invitation_expired') {
            setErrorType('invitation_expired');
          } else if (err.code === 'invitation_already_used') {
            setErrorType('invitation_already_used');
          } else if (err.code === 'invitation_revoked') {
            setErrorType('invitation_revoked');
          } else if (
            err.status === 404 ||
            err.code === 'invitation_not_found'
          ) {
            setErrorType('invitation_not_found');
          } else {
            setErrorType('generic_error');
          }
          if (
            typeof err.body === 'object' &&
            err.body !== null &&
            'message' in err.body &&
            typeof err.body.message === 'string'
          ) {
            setErrorMessage(err.body.message);
          }
        } else {
          setErrorType('generic_error');
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [token]);

  const passwordValid = isPasswordStrong(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const nameValid = displayName.trim().length >= 2;
  const canSubmit =
    nameValid && passwordValid && passwordsMatch && !isSubmitting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await completeInvitationAccount(token, {
        displayName: displayName.trim(),
        password,
      });

      // Guardar token JWT y datos de sesión
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      setIsSuccess(true);
    } catch (err: unknown) {
      if (isApiError(err)) {
        if (err.code === 'weak_password') {
          setSubmitError(
            'La contraseña no cumple con los requisitos mínimos de seguridad.',
          );
        } else if (
          typeof err.body === 'object' &&
          err.body !== null &&
          'message' in err.body &&
          typeof err.body.message === 'string'
        ) {
          setSubmitError(err.body.message);
        } else {
          setSubmitError('Ocurrió un error al crear la cuenta.');
        }
      } else {
        setSubmitError(
          'Error de conexión. Verifica tu conexión a internet e inténtalo nuevamente.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: '#94a3b8',
        }}
      >
        <div
          role="status"
          aria-live="polite"
          data-testid="loading-invitation"
          style={{
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span aria-hidden="true">⏳</span>
          <span>Verificando enlace de invitación...</span>
        </div>
      </main>
    );
  }

  if (errorType) {
    return (
      <main style={{ padding: '24px' }}>
        <InvitationStatusCard
          type={errorType}
          customMessage={errorMessage ?? undefined}
        />
      </main>
    );
  }

  if (isSuccess) {
    return (
      <main style={{ padding: '24px' }}>
        <div
          data-testid="account-created-success"
          style={{
            maxWidth: '480px',
            margin: '60px auto',
            padding: '36px 32px',
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
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontSize: '32px',
              marginBottom: '20px',
            }}
          >
            ✓
          </div>
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#f8fafc',
            }}
          >
            ¡Cuenta completada exitosamente!
          </h2>
          <p
            style={{
              margin: '0 0 28px',
              fontSize: '0.9375rem',
              color: '#94a3b8',
              lineHeight: 1.6,
            }}
          >
            Tu usuario ha sido registrado y activado en {invitation?.gymName}.
            Ya puedes comenzar a usar la plataforma.
          </p>
          <button
            type="button"
            onClick={() => {
              if (invitation?.roles.includes('ALUMNO')) {
                navigate('/alumno');
              } else {
                navigate('/entrenador');
              }
            }}
            style={{
              width: '100%',
              padding: '12px 20px',
              backgroundColor: '#10b981',
              color: '#0f172a',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Ir a mi panel principal
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: '520px',
        margin: '40px auto',
        padding: '0 20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
        }}
      >
        <header style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 700,
              color: '#38bdf8',
              marginBottom: '6px',
            }}
          >
            {invitation?.gymName}
          </div>
          <h1
            style={{
              margin: '0 0 8px',
              fontSize: '1.625rem',
              fontWeight: 700,
              color: '#f8fafc',
            }}
          >
            Completa tu cuenta
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#94a3b8',
              lineHeight: 1.5,
            }}
          >
            Has sido invitado con el correo{' '}
            <strong style={{ color: '#f1f5f9' }}>{invitation?.email}</strong>{' '}
            con el rol de{' '}
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            >
              {invitation?.roles.join(', ')}
            </span>
            .
          </p>
        </header>

        {submitError && (
          <div
            role="alert"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#ef4444',
              fontSize: '0.875rem',
              marginBottom: '20px',
            }}
          >
            {submitError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <div>
            <label
              htmlFor={nameId}
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#e2e8f0',
                marginBottom: '6px',
              }}
            >
              Nombre completo o para mostrar
            </label>
            <input
              id={nameId}
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              htmlFor={passwordId}
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#e2e8f0',
                marginBottom: '6px',
              }}
            >
              Contraseña
            </label>
            <input
              id={passwordId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
            <PasswordRequirementsList password={password} />
          </div>

          <div>
            <label
              htmlFor={confirmPasswordId}
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#e2e8f0',
                marginBottom: '6px',
              }}
            >
              Confirmar contraseña
            </label>
            <input
              id={confirmPasswordId}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                backgroundColor: '#0f172a',
                border:
                  confirmPassword.length > 0 && !passwordsMatch
                    ? '1px solid #ef4444'
                    : '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p
                role="alert"
                style={{
                  margin: '6px 0 0',
                  fontSize: '0.75rem',
                  color: '#ef4444',
                }}
              >
                Las contraseñas no coinciden.
              </p>
            )}
          </div>

          <button
            type="submit"
            data-testid="complete-account-button"
            disabled={!canSubmit}
            style={{
              width: '100%',
              padding: '12px 20px',
              backgroundColor: canSubmit ? '#38bdf8' : '#334155',
              color: canSubmit ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              marginTop: '8px',
            }}
          >
            {isSubmitting
              ? 'Completando cuenta...'
              : 'Crear mi cuenta y acceder'}
          </button>
        </form>
      </div>
    </main>
  );
};
