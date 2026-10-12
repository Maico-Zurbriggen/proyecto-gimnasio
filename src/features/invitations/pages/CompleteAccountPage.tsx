import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError, apiMessage, fieldErrors } from '../../../api/client';
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
import {
  LARGO_MAXIMO_CONTRASENA,
  isPasswordStrong,
} from '../utils/passwordStrength';

const LARGO_MINIMO_NOMBRE = 2;

/** Puesta en contexto del alumno recién dado de alta (FL-01). */
export const STUDENT_ONBOARDING_PATH = '/alumno/puesta-en-contexto';

const ESTADOS_DE_INVITACION: readonly InvitationErrorType[] = [
  'invitation_expired',
  'invitation_already_used',
  'invitation_revoked',
  'invitation_not_found',
];

/** Estado de invitación no usable, si el error es uno de ellos (T6). */
function estadoDeInvitacion(error: unknown): InvitationErrorType | null {
  if (!(error instanceof ApiError)) return null;
  return ESTADOS_DE_INVITACION.find((estado) => estado === error.code) ?? null;
}

interface ErroresDeCampo {
  displayName?: string[];
  password?: string[];
  confirmation?: string[];
}

const INPUT_CLASS =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-graphite';

function claseDeInput(conError: boolean): string {
  return `${INPUT_CLASS} ${conError ? 'border-coral-strong' : 'border-[#292823]/15'}`;
}

/** Mensajes de un campo, en texto y anunciados al lector de pantalla. */
function MensajesDeCampo({
  id,
  mensajes,
}: {
  id: string;
  mensajes?: string[];
}) {
  if (!mensajes?.length) return null;
  return (
    <ul
      id={id}
      className="text-coral-text mt-1 flex flex-col gap-0.5 text-xs font-semibold"
    >
      {mensajes.map((mensaje) => (
        <li key={mensaje}>
          <span aria-hidden="true">✕ </span>
          {mensaje}
        </li>
      ))}
    </ul>
  );
}

/**
 * Completar la cuenta desde el enlace de invitación (HU06-T5).
 *
 * Primero valida la invitación (T1) para no pedirle a nadie que elija una
 * contraseña sobre un enlace que ya no sirve. Al completarla, el backend deja la
 * sesión abierta por cookie httpOnly: el alumno sigue a su puesta en contexto
 * (FL-01) y cualquier otro rol a su pantalla inicial.
 *
 * El token sólo vive en la URL; tras el alta se reemplaza la entrada del
 * historial y nunca se escribe en la consola (criterio 10).
 */
export function CompleteAccountPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { adoptSession } = useSession();
  const ids = useId();

  const [invitation, setInvitation] = useState<ValidatedInvitation | null>(
    null,
  );
  const [cargando, setCargando] = useState(true);
  const [errorDeRed, setErrorDeRed] = useState(false);
  const [estadoInvalido, setEstadoInvalido] =
    useState<InvitationErrorType | null>(null);
  const [intento, setIntento] = useState(0);

  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [repeticion, setRepeticion] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [errores, setErrores] = useState<ErroresDeCampo>({});
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [cuentaExistente, setCuentaExistente] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) {
      setEstadoInvalido('invitation_not_found');
      setCargando(false);
      return;
    }

    const controller = new AbortController();
    setCargando(true);
    setErrorDeRed(false);
    setEstadoInvalido(null);

    fetchInvitation(token, controller.signal)
      .then(setInvitation)
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        const estado = estadoDeInvitacion(caught);
        if (estado) {
          setEstadoInvalido(estado);
        } else {
          // Criterio 3: falla de red o del servidor, se puede reintentar.
          setErrorDeRed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });

    return () => {
      controller.abort();
    };
  }, [token, intento]);

  const reintentar = useCallback(() => {
    setIntento((valor) => valor + 1);
  }, []);

  function validarLocalmente(): ErroresDeCampo {
    const encontrados: ErroresDeCampo = {};
    if (nombre.trim().length === 0) {
      encontrados.displayName = ['Ingresá tu nombre.'];
    } else if (nombre.trim().length < LARGO_MINIMO_NOMBRE) {
      encontrados.displayName = ['El nombre debe tener al menos 2 caracteres.'];
    }
    if (contrasena.length === 0) {
      encontrados.password = ['Elegí una contraseña.'];
    } else if (!isPasswordStrong(contrasena)) {
      encontrados.password = [
        'La contraseña todavía no cumple todos los requisitos.',
      ];
    }
    if (contrasena.length > 0 && contrasena !== repeticion) {
      encontrados.confirmation = ['Las contraseñas no coinciden.'];
    }
    return encontrados;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || enviando) return;

    setErrorEnvio(null);
    setCuentaExistente(false);
    const locales = validarLocalmente();
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    try {
      const result = await completeInvitationAccount(token, {
        displayName: nombre.trim(),
        password: contrasena,
      });
      // La cookie de sesión ya vino en la respuesta: sólo hay que adoptarla.
      adoptSession(result.user);
      navigate(
        result.user.roles.includes('ALUMNO')
          ? STUDENT_ONBOARDING_PATH
          : homeForRoles(result.user.roles),
        { replace: true },
      );
    } catch (caught) {
      const estado = estadoDeInvitacion(caught);
      if (estado) {
        // La invitación dejó de servir mientras la persona completaba el formulario.
        setEstadoInvalido(estado);
        return;
      }
      if (caught instanceof ApiError) {
        if (caught.code === 'user_already_exists') {
          setCuentaExistente(true);
          return;
        }
        const delServidor = fieldErrors(caught);
        if (delServidor.displayName || delServidor.password) {
          // Criterio 7: el back dice qué regla incumple.
          setErrores({
            displayName: delServidor.displayName,
            password: delServidor.password,
          });
          return;
        }
        if (caught.code === 'too_many_attempts') {
          setErrorEnvio(
            apiMessage(caught) ??
              'Hubo demasiados intentos seguidos. Esperá un minuto.',
          );
          return;
        }
      }
      setErrorEnvio(
        'No pudimos crear la cuenta. Revisá tu conexión e intentá de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  };

  const idNombre = `${ids}-nombre`;
  const idCorreo = `${ids}-correo`;
  const idContrasena = `${ids}-contrasena`;
  const idRepeticion = `${ids}-repeticion`;
  const idRequisitos = `${ids}-requisitos`;

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
            <p className="mt-1 text-[9px] font-semibold tracking-[0.2em] text-[#5f5d55] uppercase">
              Completar cuenta
            </p>
          </div>
        </div>

        {cargando ? (
          <p role="status" className="text-sm font-medium text-[#5f5d55]">
            Verificando la invitación…
          </p>
        ) : null}

        {!cargando && errorDeRed ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-[#292823]/10 bg-white p-6"
          >
            <p className="text-sm font-semibold">
              No pudimos verificar la invitación.
            </p>
            <p className="text-sm text-[#55534c]">
              Puede ser un problema de conexión. Probá de nuevo.
            </p>
            <button
              type="button"
              onClick={reintentar}
              className="bg-graphite self-start rounded-full px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {!cargando && estadoInvalido ? (
          <InvitationStatusCard type={estadoInvalido} />
        ) : null}

        {!cargando && !errorDeRed && !estadoInvalido && invitation ? (
          <form
            noValidate
            onSubmit={(event) => void handleSubmit(event)}
            aria-label="Completar cuenta"
            className="flex flex-col gap-4 rounded-2xl border border-[#292823]/10 bg-white p-6"
          >
            <div>
              <p className="eyebrow text-[#5f5d55]">{invitation.gymName}</p>
              <p className="mt-1 text-sm font-medium text-[#55534c]">
                Te invitaron como{' '}
                <strong className="font-bold">
                  {invitation.roles.join(', ').toLowerCase()}
                </strong>
                .
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={idCorreo} className="eyebrow text-[#5f5d55]">
                Correo
              </label>
              <input
                id={idCorreo}
                type="email"
                value={invitation.email}
                readOnly
                aria-readonly="true"
                className={`${claseDeInput(false)} bg-[#f4f3ee] text-[#55534c]`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={idNombre} className="eyebrow text-[#5f5d55]">
                Tu nombre <span aria-hidden="true">*</span>
              </label>
              <input
                id={idNombre}
                type="text"
                name="displayName"
                autoComplete="name"
                required
                aria-required="true"
                maxLength={100}
                aria-invalid={errores.displayName ? true : undefined}
                aria-describedby={
                  errores.displayName ? `${idNombre}-error` : undefined
                }
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className={claseDeInput(Boolean(errores.displayName))}
              />
              <MensajesDeCampo
                id={`${idNombre}-error`}
                mensajes={errores.displayName}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={idContrasena}
                  className="eyebrow text-[#5f5d55]"
                >
                  Contraseña <span aria-hidden="true">*</span>
                </label>
                <button
                  type="button"
                  aria-pressed={mostrarContrasena}
                  aria-controls={`${idContrasena} ${idRepeticion}`}
                  onClick={() => setMostrarContrasena((valor) => !valor)}
                  className="rounded-full px-2 py-1 text-xs font-bold text-[#3d3c36] underline underline-offset-2 hover:bg-black/5"
                >
                  {mostrarContrasena
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'}
                </button>
              </div>
              <input
                id={idContrasena}
                type={mostrarContrasena ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                required
                aria-required="true"
                maxLength={LARGO_MAXIMO_CONTRASENA}
                aria-invalid={errores.password ? true : undefined}
                aria-describedby={[
                  idRequisitos,
                  errores.password ? `${idContrasena}-error` : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                value={contrasena}
                onChange={(event) => setContrasena(event.target.value)}
                className={claseDeInput(Boolean(errores.password))}
              />
              <MensajesDeCampo
                id={`${idContrasena}-error`}
                mensajes={errores.password}
              />
              <div id={idRequisitos}>
                <PasswordRequirementsList password={contrasena} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={idRepeticion} className="eyebrow text-[#5f5d55]">
                Repetí la contraseña <span aria-hidden="true">*</span>
              </label>
              <input
                id={idRepeticion}
                type={mostrarContrasena ? 'text' : 'password'}
                name="confirmPassword"
                autoComplete="new-password"
                required
                aria-required="true"
                maxLength={LARGO_MAXIMO_CONTRASENA}
                aria-invalid={errores.confirmation ? true : undefined}
                aria-describedby={
                  errores.confirmation ? `${idRepeticion}-error` : undefined
                }
                value={repeticion}
                onChange={(event) => setRepeticion(event.target.value)}
                className={claseDeInput(Boolean(errores.confirmation))}
              />
              <MensajesDeCampo
                id={`${idRepeticion}-error`}
                mensajes={errores.confirmation}
              />
            </div>

            {cuentaExistente ? (
              <div
                role="alert"
                className="rounded-xl border border-[#292823]/10 bg-[#fdf3e0] p-3 text-xs font-medium text-[#5a3d0c]"
              >
                <p>
                  Ese correo ya tiene una cuenta en {invitation.gymName}. No
                  hace falta crear otra.
                </p>
                <Link
                  to="/ingresar"
                  className="mt-2 inline-block font-bold underline underline-offset-2"
                >
                  Iniciar sesión
                </Link>
              </div>
            ) : null}

            {errorEnvio ? (
              <p role="alert" className="text-coral-text text-xs font-semibold">
                {errorEnvio}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={enviando}
              aria-busy={enviando}
              className="bg-graphite mt-1 rounded-full px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {enviando ? 'Creando cuenta…' : 'Crear cuenta y entrar'}
            </button>
            <p className="text-[11px] text-[#5f5d55]">
              <span aria-hidden="true">*</span> Campos obligatorios.
            </p>
          </form>
        ) : null}
      </div>
    </main>
  );
}
