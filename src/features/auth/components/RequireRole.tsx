import { Navigate, Outlet } from 'react-router-dom';

import { homeForRoles, type UserRole } from '../roles';
import { useSession } from '../hooks/useSession';

/**
 * Restringe un grupo de rutas al rol indicado por el backend.
 *
 * Es una guarda de interfaz; el backend sigue siendo la autoridad y vuelve a
 * comprobar rol, propiedad y asignación para cada recurso.
 */
export function RequireRole({ role }: { role: UserRole }) {
  const { user } = useSession();

  if (!user) {
    return <Navigate to="/ingresar" replace />;
  }

  if (!user.roles.includes(role)) {
    return <Navigate to={homeForRoles(user.roles)} replace />;
  }

  return <Outlet />;
}
