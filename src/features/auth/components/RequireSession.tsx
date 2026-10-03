import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useSession } from '../hooks/useSession';

/**
 * Guarda de rutas privadas (HU07-T7).
 *
 * Mientras se resuelve `GET /auth/me` no se decide nada: redirigir antes de
 * saber si hay sesión mandaría al login a quien sí la tiene, en cada recarga.
 *
 * Al redirigir se conserva la ruta pedida para volver a ella tras el login, de
 * modo que una sesión vencida a mitad de camino no obligue a navegar de nuevo.
 */
export function RequireSession() {
  const { user, loading } = useSession();
  const location = useLocation();

  if (loading) {
    return (
      <p role="status" className="px-4 py-10 text-xs text-[#77756d]">
        Verificando tu sesión…
      </p>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/ingresar"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
