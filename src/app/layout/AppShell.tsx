import { Bell, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { useSession } from '../../features/auth/hooks/useSession';
import {
  availableAppRoles,
  resolveAppRole,
  type UserRole,
} from '../../features/auth/roles';
import { NAVIGATION } from './nav';

/** Acción de cerrar sesión (HU07-T8). */
function LogoutButton() {
  const { logout } = useSession();
  const [saliendo, setSaliendo] = useState(false);

  return (
    <button
      type="button"
      aria-label="Cerrar sesión"
      disabled={saliendo}
      onClick={() => {
        setSaliendo(true);
        void logout().finally(() => {
          setSaliendo(false);
        });
      }}
      className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
    >
      <LogOut className="size-4" />
    </button>
  );
}

const ROLE_META: Record<
  ReturnType<typeof resolveAppRole>,
  { title: string; name: string; initials: string; caption: string }
> = {
  alumno: {
    title: 'Entrenamiento',
    name: 'Alumno',
    initials: 'AL',
    caption: 'Sesión activa',
  },
  entrenador: {
    title: 'Coach workspace',
    name: 'Entrenador',
    initials: 'EN',
    caption: 'Sesión activa',
  },
  admin: {
    title: 'Gestión del gimnasio',
    name: 'Administrador',
    initials: 'AD',
    caption: 'Sesión activa',
  },
};

function Wordmark({ role }: { role: ReturnType<typeof resolveAppRole> }) {
  const home =
    role === 'admin'
      ? '/admin'
      : role === 'entrenador'
        ? '/entrenador'
        : '/alumno';
  return (
    <Link to={home} className="flex items-center gap-3 px-1 py-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-lime font-display text-sm font-black text-graphite">
        P
      </span>
      <div className="min-w-0">
        <p className="font-display text-[1.05rem] leading-none font-black tracking-[-0.08em] text-white">
          Vivaz Adaptive
        </p>
        <p className="mt-1 text-[9px] font-semibold tracking-[0.2em] text-white/45 uppercase">
          load 01
        </p>
      </div>
    </Link>
  );
}

function RoleSwitcher({
  active,
  roles,
}: {
  active: ReturnType<typeof resolveAppRole>;
  roles: readonly UserRole[];
}) {
  const availableRoles = availableAppRoles(roles);
  if (availableRoles.length < 2) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-black/8 bg-white/75 p-1">
      {availableRoles.map((item) => (
        <Link
          key={item.appRole}
          to={item.home}
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
            active === item.appRole
              ? 'bg-graphite text-white'
              : 'text-[#6c6a62] hover:bg-black/5'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function Sidebar({
  role,
  mobileOpen,
}: {
  role: ReturnType<typeof resolveAppRole>;
  mobileOpen: boolean;
}) {
  const meta = ROLE_META[role];
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col bg-graphite px-3 pb-4 pt-4 transition-transform lg:static lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <Wordmark role={role} />
      <p className="mb-5 mt-1 px-1 text-[9px] font-semibold tracking-[0.22em] text-white/45 uppercase">
        {meta.title}
      </p>

      <nav className="flex-1 space-y-5 overflow-y-auto px-0 pt-1">
        <div>
          <p className="px-3 text-[10px] tracking-[0.13em] text-white/35 uppercase">
            Principal
          </p>
          <ul className="mt-2 space-y-1">
            {NAVIGATION[role].primary.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === `/${role}` || item.to === '/alumno'}
                  className={({ isActive }) =>
                    `flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition ${
                      isActive
                        ? 'bg-white/12 text-white'
                        : 'text-white/70 hover:bg-white/6'
                    }`
                  }
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto rounded-full bg-lime px-1.5 py-0.5 text-[10px] font-bold text-graphite">
                      {item.badge}
                    </span>
                  ) : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="px-3 text-[10px] tracking-[0.13em] text-white/35 uppercase">
            Herramientas
          </p>
          <ul className="mt-2 space-y-1">
            {NAVIGATION[role].secondary.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition ${
                      isActive
                        ? 'bg-white/12 text-white'
                        : 'text-white/70 hover:bg-white/6'
                    }`
                  }
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="mt-2 border-t border-white/10 pt-3">
        <div className="flex items-center gap-2 rounded-xl px-2 py-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-coral font-display text-[10px] font-bold text-[#35251e]">
            {meta.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">
              {meta.name}
            </p>
            <p className="mt-0.5 text-[10px] text-white/45">{meta.caption}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

/**
 * Shell de navegación de la app (sidebar + header), estilo visual Vivaz Adaptive .
 * Único de nombre "shell" a nivel app: no contiene reglas de dominio.
 */
export function AppShell() {
  const { pathname } = useLocation();
  const { user } = useSession();
  const role = resolveAppRole(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-svh bg-transparent lg:flex">
      <Sidebar role={role} mobileOpen={mobileNavOpen} />
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#292823]/10 bg-[#f4f3ee]/80 px-4 backdrop-blur-md sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir navegación"
              className="rounded-lg p-2 text-[#4b4a44] hover:bg-black/5 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <span className="block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
            </button>
            <span className="eyebrow text-[#79776e]">
              {role === 'alumno'
                ? 'Alumno'
                : role === 'entrenador'
                  ? 'Entrenador'
                  : 'Administrador'}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <RoleSwitcher active={role} roles={user?.roles ?? []} />
            <button
              type="button"
              aria-label="Notificaciones"
              className="relative flex size-9 items-center justify-center rounded-full border border-black/8 bg-white/75 text-[#46443e] transition hover:-translate-y-0.5 hover:bg-white"
            >
              <Bell className="size-4" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-coral-strong" />
            </button>
          </div>
        </header>

        <Outlet />

        <footer className="px-4 pb-8 text-[10px] leading-5 text-[#949188] sm:px-7 lg:px-9">
          Proyecto Gimnasio · sistema visual Vivaz Adaptive . Solo el aviso de
          renovación, la advertencia de datos desactualizados y el flujo de
          desbloqueo ejecutan lógica real en este sprint.
        </footer>
      </div>
    </div>
  );
}
