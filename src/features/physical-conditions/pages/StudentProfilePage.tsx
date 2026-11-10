import { useQuery } from '@tanstack/react-query';
import { KeyRound, PencilLine, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import {
  fetchOwnContext,
  studentContextQueryKey,
} from '../../../api/studentContext';
import { InsufficientInfo } from '../../../shared/components/InsufficientInfo';
import { formatDate, humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { useSession } from '../../auth/hooks/useSession';
import { initialsOf, readIdentity } from '../../auth/identity';
import { useOwnMeasurementBlock } from '../../students/hooks/useOwnMeasurementBlock';
import { StudentConditionsPanel } from '../components/StudentConditionsPanel';
import { StudentGoalsPanel } from '../components/StudentGoalsPanel';
import { LoadingState } from '../../../shared/ui/LoadingState';

/** Ficha propia: identidad, entrenador y datos físicos que ve el entrenador. */
function ProfileSummary({ studentId }: { studentId: string }) {
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

  const stats: [string, ReactNode][] = data
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
          status.data ? (
            String(status.data.faltasConsecutivas)
          ) : (
            <InsufficientInfo
              missing="faltas seguidas"
              action="Todavía no se pudo calcular."
            />
          ),
        ],
      ]
    : [];

  return (
    <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
      {/* 1. Identidad y Entrenador */}
      <BentoCard className="flex h-full flex-col justify-between">
        <div>
          <div className="flex items-center gap-3.5">
            <span
              className="avatar size-12 text-sm shadow-xs ring-1 ring-black/5"
              aria-hidden="true"
            >
              {initialsOf(name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display truncate text-lg font-bold tracking-tight text-ink">
                {name}
              </p>
              {email ? (
                <p className="truncate text-xs text-[#68675f]">{email}</p>
              ) : null}
              <span className="chip-neutral mt-1">Alumno</span>
            </div>
          </div>

          <div className="surface-muted mt-4 flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-graphite text-lime shadow-xs">
              <UserRound aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="eyebrow text-[#77756d]">Entrenador asignado</p>
              {data?.trainer ? (
                <p className="mt-0.5 truncate text-sm font-bold text-ink">
                  {data.trainer.displayName}
                </p>
              ) : context.isPending ? (
                <LoadingState
                  label="Cargando…"
                  variant="card"
                  className="mt-1"
                />
              ) : (
                <span className="chip-warn mt-1">Esperando asignación</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#292823]/8 pt-4">
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

      {/* 2. Datos antropométricos y nivel */}
      <BentoCard className="flex h-full flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
              Datos de entrenamiento
            </h2>
            <span className="eyebrow text-[#77756d]">Ficha</span>
          </div>

          {context.isPending ? (
            <LoadingState
              label="Cargando tus datos…"
              variant="card"
              className="mt-4"
            />
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
            <dl className="mt-3.5 grid grid-cols-2 gap-2">
              {stats.map(([label, value]) => (
                <div key={label} className="surface-muted p-2.5">
                  <dt className="eyebrow text-[#77756d]">{label}</dt>
                  <dd className="font-display mt-1 text-sm font-bold tracking-tight text-ink">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </BentoCard>

      {/* 3. Objetivo de entrenamiento */}
      <div className="h-full">
        <StudentGoalsPanel studentId={studentId} />
      </div>
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
      <main className="page-body space-y-6">
        <ProfileSummary studentId={studentId} />
        <StudentConditionsPanel studentId={studentId} />
      </main>
    </div>
  );
}
