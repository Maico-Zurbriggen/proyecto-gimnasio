import {
  Building2,
  BookOpen,
  ClipboardCheck,
  Dumbbell,
  PlusCircle,
  Grid3X3,
  History,
  LayoutDashboard,
  LineChart,
  MailPlus,
  Play,
  Settings,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

import type { AppRole } from '../../features/auth/roles';

export type Role = AppRole;

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

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
      {
        label: 'Invitar alumnos',
        to: '/entrenador/invitaciones',
        icon: MailPlus,
      },
    ],
    secondary: [
      { label: 'Ejercicios', to: '/entrenador/catalogo', icon: Grid3X3 },
      { label: 'Mi perfil', to: '/entrenador/perfil', icon: UserRound },
    ],
  },
  admin: {
    primary: [
      { label: 'Analítica', to: '/admin', icon: LayoutDashboard },
      { label: 'Invitaciones', to: '/admin/usuarios', icon: MailPlus },
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
  // HU13: el SuperAdmin sólo gestiona gimnasios; no ve alumnos (RA-06).
  superadmin: {
    primary: [
      { label: 'Gimnasios', to: '/superadmin', icon: Building2 },
      {
        label: 'Alta de gimnasio',
        to: '/superadmin/gimnasios/nuevo',
        icon: PlusCircle,
      },
    ],
    secondary: [],
  },
};
