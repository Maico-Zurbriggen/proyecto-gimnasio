import { Bell, KeyRound, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { useSession } from '../../features/auth/hooks/useSession';
import {
  initialsOf,
  nameFromEmail,
  readIdentity,
} from '../../features/auth/identity';
import {
  availableAppRoles,
  homeForRoles,
  resolveAppRole,
  type UserRole,
} from '../../features/auth/roles';
import { useOwnMeasurementBlock } from '../../features/students/hooks/useOwnMeasurementBlock';
import { useTrainerStudents } from '../../features/students/hooks/useTrainerStudents';
import { totalPendingReviews } from '../../features/students/lib/pendingReviews';
import { NAVIGATION } from './nav';

const FOOTER_ACTION_CLASS =
  'flex h-8 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50';

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
      className={FOOTER_ACTION_CLASS}
    >
      <LogOut className="size-3.5" aria-hidden="true" />
      Salir
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
  superadmin: {
    title: 'Plataforma',
    name: 'SuperAdmin',
    initials: 'SA',
    caption: 'Sesión activa',
  },
};

interface UserIdentity {
  /** Nombre visible: nombre real, si no derivado del correo, si no el rol. */
  name: string;
  email: string | null;
  initials: string;
}

/**
 * Quién está en la cuenta. `/auth/me` no trae el nombre, así que se combinan
 * las fuentes que sí lo tienen (ver `features/auth/identity.ts`).
 */
function useUserIdentity(
  role: ReturnType<typeof resolveAppRole>,
): UserIdentity {
  const { user } = useSession();
  // Cualquier cuenta con rol alumno tiene su nombre en el estado de medición,
  // aunque esté navegando como entrenador.
  const studentStatus = useOwnMeasurementBlock({
    enabled: Boolean(user?.roles.includes('ALUMNO')),
  });
  const stored = user ? readIdentity(user.id) : null;
  const email = user?.email ?? stored?.email ?? null;
  const name =
    user?.displayName ??
    studentStatus.data?.displayName ??
    stored?.name ??
    (email ? nameFromEmail(email) : null);
  return name
    ? { name, email, initials: initialsOf(name) }
    : {
        name: ROLE_META[role].name,
        email: null,
        initials: ROLE_META[role].initials,
      };
}

/** Widget de identidad del header: avatar, nombre y rol activo. */
function UserBadge({
  identity,
  roleName,
}: {
  identity: UserIdentity;
  roleName: string;
}) {
  return (
    <Link
      to="/cuenta/contrasena"
      title={identity.email ?? 'Mi cuenta'}
      aria-label={`Mi cuenta: ${identity.name}, ${roleName}`}
      className="flex min-w-0 items-center gap-2.5 rounded-full border border-black/8 bg-white/75 py-1 pr-1 pl-1 transition hover:border-black/15 hover:bg-white sm:pr-3.5"
    >
      <span className="avatar size-8 text-[10px]" aria-hidden="true">
        {identity.initials}
      </span>
      <span className="hidden min-w-0 flex-col leading-tight sm:flex">
        <span className="max-w-[200px] truncate text-xs font-bold text-ink">
          {identity.name}
        </span>
        <span className="text-[10px] font-semibold tracking-wider text-[#77756d] uppercase">
          {roleName}
        </span>
      </span>
    </Link>
  );
}

const TODAY_LABEL = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function Wordmark({ role }: { role: ReturnType<typeof resolveAppRole> }) {
  const home = `/${role}`;
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

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition ${
    isActive
      ? 'bg-white/10 text-white before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full before:bg-lime'
      : 'text-white/65 hover:bg-white/6 hover:text-white'
  }`;
}

function Sidebar({
  role,
  identity,
  mobileOpen,
  routineReviewCount,
}: {
  role: ReturnType<typeof resolveAppRole>;
  identity: UserIdentity;
  mobileOpen: boolean;
  routineReviewCount: number;
}) {
  const meta = ROLE_META[role];
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col bg-graphite px-3 pb-4 pt-4 transition-transform lg:sticky lg:top-0 lg:h-svh lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <Wordmark role={role} />
      <p className="mb-5 mt-1 px-1 text-[9px] font-semibold tracking-[0.22em] text-white/45 uppercase">
        {meta.title}
      </p>

      <nav className="flex-1 space-y-5 overflow-y-auto px-0 pt-1">
        <div>
          <p className="px-3 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
            Principal
          </p>
          <ul className="mt-2 space-y-1">
            {NAVIGATION[role].primary.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === `/${role}` || item.to === '/alumno'}
                  className={navLinkClass}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                  {item.to === '/entrenador/rutinas' &&
                  routineReviewCount > 0 ? (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1.5 text-[10px] font-bold text-graphite tabular-nums">
                      {routineReviewCount}
                    </span>
                  ) : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div hidden={NAVIGATION[role].secondary.length === 0}>
          <p className="px-3 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
            Herramientas
          </p>
          <ul className="mt-2 space-y-1">
            {NAVIGATION[role].secondary.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={navLinkClass}>
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="mt-2 border-t border-white/10 pt-3">
        <div className="rounded-xl bg-white/5 p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="avatar size-8 text-[10px]" aria-hidden="true">
              {identity.initials}
            </div>
            <div className="min-w-0">
              <p
                className="truncate text-xs font-semibold text-white"
                title={identity.email ?? identity.name}
              >
                {identity.name}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-white/50">
                {meta.name}
              </p>
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {/* HU09 - RF-003: disponible para todos los roles. */}
            <Link
              to="/cuenta/contrasena"
              aria-label="Cambiar contraseña"
              title="Cambiar contraseña"
              className={FOOTER_ACTION_CLASS}
            >
              <KeyRound className="size-3.5" aria-hidden="true" />
              Contraseña
            </Link>
            <LogoutButton />
          </div>
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
  // Las rutas de cuenta no pertenecen a un rol: se muestra el menú del rol
  // principal del usuario.
  const role = resolveAppRole(
    pathname.startsWith('/cuenta/')
      ? homeForRoles(user?.roles ?? [])
      : pathname,
  );
  const trainerStudents = useTrainerStudents({
    enabled: role === 'entrenador',
  });
  const routineReviewCount = totalPendingReviews(trainerStudents.data ?? []);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const identity = useUserIdentity(role);

  return (
    <div className="min-h-svh bg-transparent lg:flex">
      <Sidebar
        role={role}
        identity={identity}
        mobileOpen={mobileNavOpen}
        routineReviewCount={routineReviewCount}
      />
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 h-[68px] shrink-0 border-b border-[#292823]/8 bg-[#f4f3ee]/85 backdrop-blur-md">
          <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-7 lg:px-9">
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
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-ink">
                  {identity.email || identity.name !== ROLE_META[role].name
                    ? `Hola, ${identity.name.split(' ')[0]}`
                    : ROLE_META[role].title}
                </p>
                <p className="text-[11px] text-[#77756d] first-letter:uppercase">
                  {TODAY_LABEL.format(new Date())}
                </p>
              </div>
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
              <UserBadge identity={identity} roleName={ROLE_META[role].name} />
            </div>
          </div>
        </header>

        <Outlet />

        <footer className="mx-auto w-full max-w-7xl px-4 pb-8 text-[10px] leading-5 text-[#949188] sm:px-7 lg:px-9">
          Vivaz Adaptive · Tu entrenamiento.
        </footer>
      </div>
    </div>
  );
}
