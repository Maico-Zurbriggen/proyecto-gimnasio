import {
  Building2,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { useSession } from '../hooks/useSession';

const ROLE_LABELS = {
  ALUMNO: 'Alumno',
  ENTRENADOR: 'Entrenador',
  ADMINISTRADOR: 'Administrador',
  SUPERADMIN: 'Superadministrador',
} as const;

export function AccountProfilePage() {
  const { user } = useSession();

  if (!user) return null;

  return (
    <div>
      <PageHeader
        kicker="Mi cuenta"
        title="Tu perfil de acceso."
        description="Consultá la identidad, el gimnasio y los permisos asociados a tu sesión."
      />
      <main className="page-body grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)]">
        <BentoCard className="p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <AccountField
              icon={UserRound}
              label="Nombre"
              value={user.displayName}
            />
            <AccountField icon={Mail} label="Correo" value={user.email} />
            <AccountField
              icon={Building2}
              label="Gimnasio"
              value={user.gymName}
            />
            <div>
              <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#77756d] uppercase">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Roles habilitados
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-graphite px-3 py-1 text-xs font-bold text-white"
                  >
                    {ROLE_LABELS[role]}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-6 border-t border-black/8 pt-4 text-xs leading-relaxed text-[#77756d]">
            El correo y los roles son administrados por el gimnasio y no pueden
            modificarse desde esta pantalla.
          </p>
        </BentoCard>

        <BentoCard tone="graphite" className="p-5 sm:p-6">
          <KeyRound className="size-6 text-lime" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-bold">
            Seguridad de la cuenta
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            Actualizá tu contraseña sin cerrar esta sesión. Las demás sesiones
            abiertas se revocarán por seguridad.
          </p>
          <Link
            to="/cuenta/contrasena"
            className="mt-5 inline-flex rounded-xl bg-lime px-4 py-2.5 text-sm font-bold text-graphite transition hover:brightness-95"
          >
            Cambiar contraseña
          </Link>
        </BentoCard>
      </main>
    </div>
  );
}

function AccountField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#77756d] uppercase">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-2 break-words text-base font-semibold text-ink">
        {value}
      </p>
    </div>
  );
}
