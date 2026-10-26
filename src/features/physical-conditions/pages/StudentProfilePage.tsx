import { useQuery } from '@tanstack/react-query';
import { KeyRound, PencilLine, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  fetchOwnContext,
  studentContextQueryKey,
} from '../../../api/studentContext';
import { formatDate, humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { useSession } from '../../auth/hooks/useSession';
import { initialsOf, readIdentity } from '../../auth/identity';
import { useOwnMeasurementBlock } from '../../students/hooks/useOwnMeasurementBlock';
import { StudentConditionsPanel } from '../components/StudentConditionsPanel';
import { StudentGoalsPanel } from '../components/StudentGoalsPanel';

/** Ficha propia: identidad, entrenador y datos físicos que ve el entrenador. */
function ProfileSummary() {
  const { user } = useSession();
  const status = useOwnMeasurementBlock();
  const context = useQuery({
    queryKey: studentContextQueryKey,
    queryFn: ({ signal }) => fetchOwnContext(signal),
  });

  const stored = user ? readIdentity(user.id) : null;
  const name =
    user?.displayName ?? status.data?.displayName ?? stored?.name ?? 'Alumno';
  const email = user?.email ?? stored?.email ?? null;
  const data = context.data;

  const stats: [string, string][] = data
    ? [
        [
          'Nivel',
          data.experienceLevel
            ? humanizeEnum(data.experienceLevel)
            : 'Sin declarar',
        ],
        [
          'Frecuencia',
          data.availableDaysPerWeek
            ? `${String(data.availableDaysPerWeek)} días por semana`
            : 'Sin declarar',
        ],
        [
          'Altura',
          data.heightCm === null
            ? 'Sin declarar'
            : `${String(data.heightCm)} cm`,
        ],
        [
          'Peso',
          data.weightKg === null
            ? 'Sin declarar'
            : `${String(data.weightKg)} kg`,
        ],
        [
          'Última medición',
          status.data?.fechaUltimaMedicion
            ? formatDate(status.data.fechaUltimaMedicion)
            : 'Sin registrar',
        ],
        [
          'Faltas seguidas',
          status.data ? String(status.data.faltasConsecutivas) : '—',
        ],
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <BentoCard>
        <div className="flex items-center gap-4">
          <span className="avatar size-14 text-base" aria-hidden="true">
            {initialsOf(name)}
          </span>
          <div className="min-w-0">
            <p className="font-display truncate text-xl font-bold tracking-tight">
              {name}
            </p>
            {email ? (
              <p className="truncate text-sm text-[#68675f]">{email}</p>
            ) : null}
            <span className="chip-neutral mt-1.5">Alumno</span>
          </div>
        </div>
        <div className="surface-muted mt-5 flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-graphite text-lime">
            <UserRound aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow text-[#77756d]">Entrenador asignado</p>
            {data?.trainer ? (
              <p className="mt-1 truncate text-sm font-semibold">
                {data.trainer.displayName}
              </p>
            ) : context.isPending ? (
              <p className="mt-1 text-sm text-[#77756d]">Cargando…</p>
            ) : (
              <span className="chip-warn mt-1">Esperando asignación</span>
            )}
          </div>
        </div>
      </BentoCard>

      <BentoCard>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Datos de entrenamiento
        </h2>
        {context.isPending ? (
          <p role="status" className="mt-4 text-sm text-[#77756d]">
            Cargando tus datos…
          </p>
        ) : context.isError ? (
          <div className="mt-4 flex flex-col items-start gap-3">
            <p role="alert" className="field-error">
              No pudimos cargar tus datos.
            </p>
            <button
              type="button"
              onClick={() => void context.refetch()}
              disabled={context.isFetching}
              className="btn-secondary btn-sm"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <dl className="mt-4 grid grid-cols-2 gap-2.5">
            {stats.map(([label, value]) => (
              <div key={label} className="surface-muted row-interactive p-3.5">
                <dt className="eyebrow text-[#77756d]">{label}</dt>
                <dd className="font-display mt-1.5 text-base font-semibold tracking-tight">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/alumno/puesta-en-contexto"
            className="btn-secondary btn-sm"
          >
            <PencilLine aria-hidden="true" className="size-3.5" />
            Actualizar datos físicos
          </Link>
          <Link to="/cuenta/contrasena" className="btn-ghost btn-sm">
            <KeyRound aria-hidden="true" className="size-3.5" />
            Gestionar contraseña
          </Link>
        </div>
      </BentoCard>
    </div>
  );
}

/** Perfil del alumno: su ficha y sus condiciones físicas (HU11). */
export function StudentProfilePage({ studentId }: { studentId: string }) {
  return (
    <div>
      <PageHeader
        kicker="Mi perfil"
        title="Tus datos de entrenamiento."
        description="Lo que declares acá lo ve tu entrenador para cuidar tu rutina."
      />
      <main className="page-body grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ProfileSummary />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-7">
          <StudentGoalsPanel studentId={studentId} />
          <StudentConditionsPanel studentId={studentId} />
        </div>
      </main>
    </div>
  );
}
