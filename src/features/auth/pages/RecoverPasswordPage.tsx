import { useMutation } from '@tanstack/react-query';
import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { ApiError, fieldErrors } from '../../../api/client';
import {
  requestPasswordRecovery,
  resetPassword,
} from '../../../api/passwordRecovery';
import { isPasswordStrong } from '../../../shared/lib/passwordStrength';
import {
  NewPasswordFields,
  validateNewPassword,
  type NewPasswordErrors,
} from '../components/NewPasswordFields';

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BOTON = 'btn-primary';
function Marco({
  subtitulo,
  children,
}: {
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center gap-3">
          <span className="bg-lime text-graphite font-display flex size-9 shrink-0 items-center justify-center rounded-[11px] text-sm font-black">
            P
          </span>
          <div>
            <p className="font-display text-[1.05rem] leading-none font-black tracking-[-0.08em]">
              Vivaz Adaptive
            </p>
            <p className="mt-1 text-[9px] font-semibold tracking-[0.2em] text-[#5f5d55] uppercase">
              {subtitulo}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-3xl border border-[#292823]/8 bg-white p-6 sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}

/** Pedido del enlace (HU09 - criterios front 1 a 5). */
function PedirEnlace() {
  const ids = useId();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pedir = useMutation({ mutationFn: requestPasswordRecovery });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pedir.isPending) return;
    if (!email.trim()) {
      setError('Ingresá tu correo.');
      return;
    }
    if (!FORMATO_CORREO.test(email.trim())) {
      setError(
        'El correo no tiene un formato válido (ejemplo: nombre@correo.com).',
      );
      return;
    }
    setError(null);
    pedir.mutate(email.trim());
  };

  const limitado =
    pedir.error instanceof ApiError &&
    pedir.error.code === 'recovery_rate_limited';

  return (
    <Marco subtitulo="Recuperar contraseña">
      <h1 className="font-display text-xl font-black tracking-[-0.03em]">
        ¿Olvidaste tu contraseña?
      </h1>
      {pedir.isSuccess ? (
        <div role="status" className="flex flex-col gap-3">
          {/* Criterio 3: el mismo mensaje exista o no el correo. */}
          <p className="text-sm text-[#3d3c36]">
            Si el correo está registrado, vas a recibir un enlace para
            restablecer tu contraseña. Vence en 2 horas y sirve una sola vez.
          </p>
          <Link
            to="/ingresar"
            className="text-sm font-bold underline underline-offset-2"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form
          noValidate
          aria-label="Pedir enlace de recuperación"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <p className="text-sm text-[#55534c]">
            Te enviamos un enlace para elegir una contraseña nueva. Podés
            pedirlo hasta dos veces por día.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-correo`} className="field-label">
              Correo <span aria-hidden="true">*</span>
            </label>
            <input
              id={`${ids}-correo`}
              type="email"
              autoComplete="email"
              required
              aria-required="true"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${ids}-correo-error` : undefined}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
            />
            {error ? (
              <p
                id={`${ids}-correo-error`}
                className="text-coral-text text-xs font-semibold"
              >
                <span aria-hidden="true">✕ </span>
                {error}
              </p>
            ) : null}
          </div>
          {limitado ? (
            <p role="alert" className="text-coral-text text-xs font-semibold">
              Ya pediste dos enlaces hoy. Probá de nuevo mañana o revisá tu
              correo (también la carpeta de spam).
            </p>
          ) : pedir.isError ? (
            <p role="alert" className="text-coral-text text-xs font-semibold">
              No pudimos procesar el pedido. Revisá tu conexión e intentá de
              nuevo.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pedir.isPending}
            aria-busy={pedir.isPending}
            className={`${BOTON} w-full`}
          >
            {pedir.isPending ? 'Enviando…' : 'Recuperar contraseña'}
          </button>
          <Link
            to="/ingresar"
            className="text-sm font-bold underline underline-offset-2"
          >
            Volver a iniciar sesión
          </Link>
        </form>
      )}
    </Marco>
  );
}

/** Nueva contraseña desde el enlace (HU09 - criterios front 5 a 10). */
function ElegirContrasena({
  token,
  onNewLink,
}: {
  token: string;
  /** Vuelve al pedido del enlace (la URL ya no tiene el token). */
  onNewLink: () => void;
}) {
  const [contrasena, setContrasena] = useState('');
  const [repeticion, setRepeticion] = useState('');
  const [errores, setErrores] = useState<NewPasswordErrors>({});
  const restablecer = useMutation({
    mutationFn: () => resetPassword(token, contrasena),
    onError: (error) => setErrores(fieldErrors(error)),
  });

  const enlaceInvalido =
    restablecer.error instanceof ApiError &&
    (restablecer.error.code === 'invalid_recovery_token' ||
      restablecer.error.code === 'invalid_recovery_request');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (restablecer.isPending) return;
    const locales = validateNewPassword(
      contrasena,
      repeticion,
      isPasswordStrong,
    );
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;
    restablecer.mutate();
  };

  if (restablecer.isSuccess) {
    return (
      <Marco subtitulo="Contraseña restablecida">
        <h1 className="font-display text-xl font-black tracking-[-0.03em]">
          Listo, ya podés ingresar.
        </h1>
        <p role="status" className="text-sm text-[#3d3c36]">
          Tu contraseña cambió y cerramos las sesiones que tenías abiertas.
        </p>
        <Link to="/ingresar" className={`${BOTON} w-full`}>
          Iniciar sesión
        </Link>
      </Marco>
    );
  }

  if (enlaceInvalido) {
    // Criterio 8: vencido, usado o inválido, sin formulario y sin detalles.
    return (
      <Marco subtitulo="Recuperar contraseña">
        <h1 className="font-display text-xl font-black tracking-[-0.03em]">
          El enlace ya no sirve
        </h1>
        <p role="alert" className="text-sm text-[#3d3c36]">
          Puede que haya vencido (dura 2 horas), que ya se haya usado o que
          hayas pedido uno más nuevo. Pedí otro enlace para continuar.
        </p>
        <button type="button" onClick={onNewLink} className={`${BOTON} w-full`}>
          Pedir un enlace nuevo
        </button>
      </Marco>
    );
  }

  return (
    <Marco subtitulo="Nueva contraseña">
      <h1 className="font-display text-xl font-black tracking-[-0.03em]">
        Elegí tu contraseña nueva
      </h1>
      <form
        noValidate
        aria-label="Elegir contraseña nueva"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <NewPasswordFields
          password={contrasena}
          confirmation={repeticion}
          onPasswordChange={setContrasena}
          onConfirmationChange={setRepeticion}
          errors={errores}
        />
        {restablecer.isError && !errores.password && !enlaceInvalido ? (
          <p role="alert" className="text-coral-text text-xs font-semibold">
            No pudimos cambiar la contraseña. Intentá de nuevo.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={restablecer.isPending}
          aria-busy={restablecer.isPending}
          className={`${BOTON} w-full`}
        >
          {restablecer.isPending ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </Marco>
  );
}

/**
 * Recuperación de credenciales (HU09). Sin token en la URL pide el correo; con
 * token muestra el formulario de contraseña nueva. El token se saca de la
 * barra de direcciones apenas se lee, para que no quede expuesto (criterio
 * front 10).
 */
export function RecoverPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(() => params.get('token'));

  useEffect(() => {
    if (params.get('token')) {
      navigate('/recuperar-contrasena', { replace: true });
    }
  }, [params, navigate]);

  return token ? (
    <ElegirContrasena token={token} onNewLink={() => setToken(null)} />
  ) : (
    <PedirEnlace />
  );
}
