import type { AuthenticatedUser } from '../../api/auth';

export type UserRole = AuthenticatedUser['roles'][number];
export type AppRole = 'alumno' | 'entrenador' | 'admin';

export interface AppRoleOption {
  appRole: AppRole;
  userRole: UserRole;
  label: string;
  home: string;
}

export const APP_ROLE_OPTIONS: readonly AppRoleOption[] = [
  { appRole: 'alumno', userRole: 'ALUMNO', label: 'Alumno', home: '/alumno' },
  {
    appRole: 'entrenador',
    userRole: 'ENTRENADOR',
    label: 'Entrenador',
    home: '/entrenador',
  },
  {
    appRole: 'admin',
    userRole: 'ADMINISTRADOR',
    label: 'Admin',
    home: '/admin',
  },
] as const;

/** Mantiene la prioridad de entrada histórica: entrenador, admin y alumno. */
const DEFAULT_ROLE_PRIORITY: readonly UserRole[] = [
  'ENTRENADOR',
  'ADMINISTRADOR',
  'ALUMNO',
];

export function availableAppRoles(roles: readonly UserRole[]): AppRoleOption[] {
  return APP_ROLE_OPTIONS.filter((option) => roles.includes(option.userRole));
}

export function homeForRoles(roles: readonly UserRole[]): string {
  const preferredRole = DEFAULT_ROLE_PRIORITY.find((role) =>
    roles.includes(role),
  );
  return (
    APP_ROLE_OPTIONS.find((option) => option.userRole === preferredRole)
      ?.home ?? '/sin-acceso'
  );
}

export function resolveAppRole(pathname: string): AppRole {
  if (pathname.startsWith('/entrenador')) return 'entrenador';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'alumno';
}

export function canAccessPath(
  pathname: string,
  roles: readonly UserRole[],
): boolean {
  const option = APP_ROLE_OPTIONS.find(
    ({ home }) => pathname === home || pathname.startsWith(`${home}/`),
  );
  return option ? roles.includes(option.userRole) : true;
}
