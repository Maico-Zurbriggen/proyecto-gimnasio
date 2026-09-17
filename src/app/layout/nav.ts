import {
  BookOpen,
  ClipboardCheck,
  Dumbbell,
  Grid3X3,
  History,
  LayoutDashboard,
  LineChart,
  Play,
  Settings,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export type Role = 'alumno' | 'entrenador' | 'admin';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
}

export const ROLES: { role: Role; label: string }[] = [
  { role: 'alumno', label: 'Alumno' },
  { role: 'entrenador', label: 'Entrenador' },
  { role: 'admin', label: 'Admin' },
];

export const NAVIGATION: Record<
  Role,
  { primary: NavItem[]; secondary: NavItem[] }
> = {
  alumno: {
    primary: [
      { label: 'Resumen', to: '/alumno', icon: LayoutDashboard },
      { label: 'Mi rutina', to: '/alumno/rutina', icon: Dumbbell },
      { label: 'Sesión', to: '/alumno/sesion', icon: Play },
      { label: 'Progreso', to: '/alumno/progreso', icon: LineChart },
      { label: 'Historial', to: '/alumno/historial', icon: History },
    ],
    secondary: [
      { label: 'Ejercicios', to: '/alumno/catalogo', icon: Grid3X3 },
      { label: 'Mi perfil', to: '/alumno/perfil', icon: UserRound },
    ],
  },
  entrenador: {
    primary: [
      { label: 'Cartera', to: '/entrenador', icon: LayoutDashboard },
      { label: 'Alumnos', to: '/entrenador/alumnos', icon: UsersRound },
      {
        label: 'Rutinas',
        to: '/entrenador/rutinas',
        icon: ClipboardCheck,
      },
      { label: 'Plantillas', to: '/entrenador/plantillas', icon: BookOpen },
    ],
    secondary: [
      { label: 'Ejercicios', to: '/entrenador/catalogo', icon: Grid3X3 },
      { label: 'Mi perfil', to: '/entrenador/perfil', icon: UserRound },
    ],
  },
  admin: {
    primary: [
      { label: 'Analítica', to: '/admin', icon: LayoutDashboard },
      { label: 'Usuarios', to: '/admin/usuarios', icon: UsersRound },
      {
        label: 'Asignaciones',
        to: '/admin/asignaciones',
        icon: ClipboardCheck,
      },
      { label: 'Catálogo', to: '/admin/ejercicios', icon: Grid3X3 },
    ],
    secondary: [
      { label: 'Reglas', to: '/admin/reglas', icon: SlidersHorizontal },
      { label: 'Configuración', to: '/admin/configuracion', icon: Settings },
    ],
  },
};

export function resolveRole(pathname: string): Role {
  if (pathname.startsWith('/entrenador')) return 'entrenador';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'alumno';
}
