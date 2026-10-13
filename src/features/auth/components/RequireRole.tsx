import { Link, Navigate, Outlet } from 'react-router-dom';

import { homeForRoles, type UserRole } from '../roles';
import { useSession } from '../hooks/useSession';

/**
 * Restringe un grupo de rutas al rol indicado por el backend.
 *
 * Es una guarda de interfaz; el backend sigue siendo la autoridad y vuelve a
 * comprobar rol, propiedad y asignación para cada recurso.
 */
export function RequireRole({
  role,
  showDenied = false,
}: {
  role: UserRole;
  /**
   * Muestra un acceso denegado explícito en lugar de redirigir. Lo usan las
   * áreas que un rol nunca debería poder abrir por URL directa (HU13).
   */
  showDenied?: boolean;
}) {
  const { user } = useSession();

  if (!user) {
    return <Navigate to="/ingresar" replace />;
  }

  if (!user.roles.includes(role)) {
    if (showDenied) {
      return (
        <main className="flex min-h-[60vh] items-center justify-center px-4">
          <div
            role="alert"
            className="flex max-w-sm flex-col gap-3 rounded-2xl border border-[#292823]/10 bg-white p-6"
          >
            <h1 className="font-display text-xl font-black tracking-[-0.03em]">
              Acceso denegado
            </h1>
            <p className="text-sm text-[#55534c]">
              Tu cuenta no tiene permiso para ver esta sección.
            </p>
            <Link
              to={homeForRoles(user.roles)}
              className="bg-graphite self-start rounded-full px-4 py-2.5 text-sm font-bold text-white"
            >
              Ir a mi inicio
            </Link>
          </div>
        </main>
      );
    }
    return <Navigate to={homeForRoles(user.roles)} replace />;
  }

  return <Outlet />;
}
