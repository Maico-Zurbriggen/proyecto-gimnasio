import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import {
  completeInvitationAccount,
  fetchInvitation,
  type ValidatedInvitation,
} from '../../../api/invitations';
import { useSession } from '../../auth/hooks/useSession';
import { homeForRoles } from '../../auth/roles';
import {
  InvitationStatusCard,
  type InvitationErrorType,
} from '../components/InvitationStatusCard';
import { PasswordRequirementsList } from '../components/PasswordRequirementsList';
import { isPasswordStrong } from '../utils/passwordStrength';

const LARGO_MINIMO_NOMBRE = 2;

/** Traduce el error del backend al estado que la tarjeta sabe explicar (T6). */
function estadoDeError(error: unknown): InvitationErrorType {
  if (!(error instanceof ApiError)) {
    return 'generic_error';
  }
  switch (error.code) {
    case 'invitation_expired':
    case 'invitation_already_used':
    case 'invitation_revoked':
    case 'invitation_not_found':
      return error.code;
    default:
      return error.status === 404 ? 'invitation_not_found' : 'generic_error';
  }
}

/** Mensaje del backend, si lo trae. */
function mensajeDeError(error: unknown): string | null {
  if (
    error instanceof ApiError &&
    typeof error.body === 'object' &&
    error.body !== null &&
    'message' in error.body &&
    typeof error.body.message === 'string'
  ) {
    return error.body.message;
  }
  return null;
}

/**
 * Completar la cuenta desde el enlace de invitación (HU06-T5).
 *
 * Primero valida la invitación (T1) para no pedirle a nadie que elija una
 * contraseña sobre un enlace que ya no sirve. Al completarla, el backend deja la
 * sesión abierta por cookie, así que la persona entra derecho a su home sin pasar
 * por el login.
 */
export function CompleteAccountPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { adoptSession } = useSession();

  const [invitation, setInvitation] = useState<ValidatedInvitation | null>(
    null,
  );
  const [cargando, setCargando] = useState(true);
  const [estadoInvalido, setEstadoInvalido] =
    useState<InvitationErrorType | null>(null);
  const [mensajeInvalido, setMensajeInvalido] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [repeticion, setRepeticion] = useState('');
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) {
      setEstadoInvalido('invitation_not_found');
      setCargando(false);
      return;
    }

    const controller = new AbortController();
    setCargando(true);
    setEstadoInvalido(null);
    setMensajeInvalido(null);

    fetchInvitation(token, controller.signal)
      .then((data) => {
        setInvitation(data);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setEstadoInvalido(estadoDeError(caught));
        setMensajeInvalido(mensajeDeError(caught));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [token]);

  const nombreValido = nombre.trim().length >= LARGO_MINIMO_NOMBRE;
  const contrasenaValida = isPasswordStrong(contrasena);
  const repeticionCoincide = contrasena.length > 0 && contrasena === repeticion;
  const puedeEnviar =
    nombreValido && contrasenaValida && repeticionCoincide && !enviando;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !puedeEnviar) {
      return;
    }

    setEnviando(true);
    setErrorEnvio(null);

    try {
      const result = await completeInvitationAccount(token, {
        displayName: nombre.trim(),
        password: contrasena,
      });
      // La cookie de sesión ya vino en la respuesta: sólo hay que adoptarla.
      adoptSession(result.user);
      navigate(homeForRoles(result.user.roles), { replace: true });
    } catch (caught) {
      const estado = estadoDeError(caught);
      if (estado !== 'generic_error') {
        // La invitación dejó de servir mientras la persona completaba el formulario.
        setEstadoInvalido(estado);
        setMensajeInvalido(mensajeDeError(caught));
        return;
      }
      setErrorEnvio(
        mensajeDeError(caught) ??
          'No pudimos crear la cuenta. Intentá de nuevo en un momento.',
      );
    } finally {
      setEnviando(false);
    }
  };

  const inputClass =
    'rounded-xl border border-[#292823]/15 bg-white px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-graphite';

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex items-center gap-3">
          <span className="bg-lime text-graphite font-display flex size-9 shrink-0 items-center justify-center rounded-[11px] text-sm font-black">
            P
          </span>
          <div>
            <p className="font-display text-[1.05rem] leading-none font-black tracking-[-0.08em]">
              Vivaz Adaptive
            </p>
            <p className="mt-1 text-[9px] font-semibold tracking-[0.2em] text-[#77756d] uppercase">
              Completar cuenta
            </p>
          </div>
        </div>

        {cargando ? (
          <p role="status" className="text-sm font-medium text-[#77756d]">
            Verificando la invitación…
          </p>
        ) : null}

        {!cargando && estadoInvalido ? (
          <InvitationStatusCard
            type={estadoInvalido}
            customMessage={mensajeInvalido}
          />
        ) : null}

        {!cargando && !estadoInvalido && invitation ? (
          <form
            onSubmit={(event) => void handleSubmit(event)}
            aria-label="Completar cuenta"
            className="flex flex-col gap-4 rounded-2xl border border-[#292823]/10 bg-white p-6"
          >
            <div>
              <p className="eyebrow text-[#77756d]">{invitation.gymName}</p>
              <p className="mt-1 text-sm font-medium text-[#55534c]">
                Te invitaron como{' '}
                <strong className="font-bold">
                  {invitation.roles.join(', ').toLowerCase()}
                </strong>{' '}
                con el correo{' '}
                <strong className="font-bold">{invitation.email}</strong>.
              </p>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="eyebrow text-[#77756d]">Tu nombre</span>
              <input
                type="text"
                name="displayName"
                autoComplete="name"
                required
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="eyebrow text-[#77756d]">Contraseña</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                value={contrasena}
                onChange={(event) => setContrasena(event.target.value)}
                className={inputClass}
              />
            </label>

            <PasswordRequirementsList password={contrasena} />

            <label className="flex flex-col gap-1.5">
              <span className="eyebrow text-[#77756d]">
                Repetí la contraseña
              </span>
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                value={repeticion}
                onChange={(event) => setRepeticion(event.target.value)}
                className={inputClass}
              />
            </label>

            {repeticion.length > 0 && !repeticionCoincide ? (
              <p className="text-coral-strong text-xs font-medium">
                Las contraseñas no coinciden.
              </p>
            ) : null}

            {errorEnvio ? (
              <p role="alert" className="text-coral-strong text-xs font-medium">
                {errorEnvio}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!puedeEnviar}
              className="bg-graphite mt-1 rounded-full px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {enviando ? 'Creando cuenta…' : 'Crear cuenta y entrar'}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
