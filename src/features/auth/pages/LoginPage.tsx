import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import { useSession } from '../hooks/useSession';

interface LocationState {
  from?: string;
}

/** Destino inicial según el rol con el que entró la persona. */
function inicioSegunRol(roles: readonly string[]): string {
  if (roles.includes('ENTRENADOR')) {
    return '/entrenador';
  }
  if (roles.includes('ADMINISTRADOR')) {
    return '/admin';
  }
  return '/alumno';
}

/**
 * Pantalla de inicio de sesión (HU07-T6).
 *
 * El error es siempre el mismo, cualquiera sea el motivo: el backend no
 * distingue correo inexistente de contraseña incorrecta ni de cuenta suspendida,
 * y la interfaz no debe inventar una diferencia que el servidor no da.
 */
export function LoginPage() {
  const { user, login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Con sesión abierta no hay nada que hacer acá.
  if (user) {
    return <Navigate to={inicioSegunRol(user.roles)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      await login({ email, password });
      const destino = (location.state as LocationState | null)?.from;
      navigate(destino ?? '/', { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 401
          ? 'El correo o la contraseña no son correctos.'
          : 'No pudimos iniciar sesión. Intentá de nuevo en un momento.',
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
              Iniciar sesión
            </p>
          </div>
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          aria-label="Iniciar sesión"
          className="flex flex-col gap-4 rounded-2xl border border-[#292823]/10 bg-white p-6"
        >
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow text-[#77756d]">Correo</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="eyebrow text-[#77756d]">Contraseña</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
            />
          </label>

          {error ? (
            <p role="alert" className="text-coral-strong text-xs font-medium">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={enviando}
            className="bg-graphite mt-1 rounded-full px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
