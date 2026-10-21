import { Check } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import { useSession } from '../hooks/useSession';
import { canAccessPath, homeForRoles } from '../roles';

interface LocationState {
  from?: string;
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
    return <Navigate to={homeForRoles(user.roles)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      const authenticatedUser = await login({ email, password });
      const requestedPath = (location.state as LocationState | null)?.from;
      const destination =
        requestedPath && canAccessPath(requestedPath, authenticatedUser.roles)
          ? requestedPath
          : homeForRoles(authenticatedUser.roles);
      navigate(destination, { replace: true });
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

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Panel de marca: sólo en pantallas anchas, el formulario no depende de él. */}
      <aside className="technical-notch relative m-4 hidden flex-col justify-between overflow-hidden rounded-[2rem] bg-graphite p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="bg-lime text-graphite font-display flex size-9 items-center justify-center rounded-[11px] text-sm font-black">
            P
          </span>
          <span className="font-display text-[1.05rem] font-black tracking-[-0.08em]">
            Vivaz Adaptive
          </span>
        </div>
        <div>
          <p className="eyebrow text-lime">Entrenamiento adaptativo</p>
          <p className="font-display mt-4 max-w-md text-4xl leading-[1.05] font-semibold tracking-[-0.04em]">
            Una rutina que se ajusta a vos, revisada por tu entrenador.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/70">
            {[
              'Rutinas generadas con IA sobre el equipamiento del gimnasio.',
              'Seguimiento de mediciones y condiciones físicas.',
              'Cada cambio pasa por la revisión de un profesional.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-lime"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[11px] text-white/40">Vivaz Adaptive · load 01</p>
      </aside>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
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
            className="flex flex-col gap-4 rounded-3xl border border-[#292823]/8 bg-white p-6 shadow-[0_12px_32px_-22px_rgb(20_20_18/0.25)] sm:p-8"
          >
            <div className="mb-1">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Te damos la bienvenida
              </h1>
              <p className="mt-1 text-sm text-[#68675f]">
                Ingresá con el correo de tu cuenta del gimnasio.
              </p>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow text-[#77756d]">Correo</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="field"
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
                className="field"
              />
            </label>
            {/* HU09: recuperación de credenciales sin sesión. */}
            <Link
              to="/recuperar-contrasena"
              className="-mt-2 self-end text-xs font-semibold text-[#55534c] underline underline-offset-2 hover:text-ink"
            >
              Olvidé mi contraseña
            </Link>

            {error ? (
              <p role="alert" className="field-error">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={enviando}
              className="btn-primary mt-1 w-full"
            >
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
