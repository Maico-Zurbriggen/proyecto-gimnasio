import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import {
  fetchGyms,
  gymsQueryKey,
  reissueBootstrapInvitation,
  type BootstrapInvitationStatus,
  type GymSummary,
} from '../../../api/gyms';
import { formatDate } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';

/** Texto e icono por estado: la información nunca depende sólo del color. */
const ESTADO_INVITACION: Record<
  BootstrapInvitationStatus,
  { texto: string; icono: string; clase: string }
> = {
  PENDIENTE: {
    texto: 'Invitación pendiente',
    icono: '◷',
    clase: 'bg-[#fdf3e0] text-[#5a3d0c]',
  },
  USADA: {
    texto: 'Administrador activo',
    icono: '✓',
    clase: 'bg-lime-soft text-[#3b4d14]',
  },
  VENCIDA: {
    texto: 'Invitación vencida',
    icono: '!',
    clase: 'bg-[#fbe7e5] text-[#7a2a20]',
  },
  REVOCADA: {
    texto: 'Invitación revocada',
    icono: '✕',
    clase: 'bg-[#fbe7e5] text-[#7a2a20]',
  },
};

function ReenviarInvitacion({ gym }: { gym: GymSummary }) {
  const queryClient = useQueryClient();
  const reenviar = useMutation({
    mutationFn: () => reissueBootstrapInvitation(gym.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gymsQueryKey }),
  });

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={reenviar.isPending}
        aria-busy={reenviar.isPending}
        onClick={() => reenviar.mutate()}
        className="rounded-full border border-[#292823]/15 bg-white px-3 py-1.5 text-xs font-bold transition hover:bg-[#faf9f4] disabled:opacity-60"
      >
        {reenviar.isPending ? 'Reenviando…' : 'Reenviar invitación'}
      </button>
      <span aria-live="polite" className="text-[11px]">
        {reenviar.isSuccess
          ? `Enviada a ${reenviar.data.invitationSentTo}.`
          : reenviar.isError
            ? reenviar.error instanceof ApiError &&
              reenviar.error.code === 'bootstrap_invitation_already_used'
              ? 'El administrador ya completó su cuenta.'
              : 'No se pudo reenviar. Probá de nuevo.'
            : ''}
      </span>
    </div>
  );
}

function FilaGimnasio({ gym }: { gym: GymSummary }) {
  const invitacion = gym.bootstrapInvitation;
  const estado = invitacion ? ESTADO_INVITACION[invitacion.status] : null;

  return (
    <li className="flex flex-col gap-3 border-b border-[#292823]/7 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-bold break-words">{gym.name}</p>
        <p className="mt-1 text-xs text-[#5f5d55] break-words">
          {gym.timezone} · alta {formatDate(gym.createdAt)} ·{' '}
          {gym.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}
        </p>
        {invitacion ? (
          <p className="mt-1 text-xs break-all text-[#5f5d55]">
            Primer administrador: {invitacion.email}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        {estado ? (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${estado.clase}`}
          >
            <span aria-hidden="true">{estado.icono} </span>
            {estado.texto}
          </span>
        ) : (
          <span className="text-[11px] text-[#5f5d55]">
            {gym.administratorCount > 0
              ? 'Administrador activo'
              : 'Sin invitación de arranque'}
          </span>
        )}
        {invitacion && invitacion.status !== 'USADA' ? (
          <ReenviarInvitacion gym={gym} />
        ) : null}
      </div>
    </li>
  );
}

/**
 * Gestión de gimnasios afiliados (HU13 - T2): listado con su estado y el de la
 * invitación del primer administrador, que se puede reenviar mientras no se
 * haya usado. El SuperAdmin no ve información de alumnos (RA-06).
 */
export function GymsPage() {
  const gyms = useQuery({
    queryKey: gymsQueryKey,
    queryFn: ({ signal }) => fetchGyms(signal),
  });

  return (
    <div>
      <PageHeader
        kicker="Plataforma"
        title="Gimnasios afiliados."
        actions={
          <Link
            to="/superadmin/gimnasios/nuevo"
            className="bg-graphite rounded-full px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            Dar de alta un gimnasio
          </Link>
        }
      />
      <main className="px-4 pb-10 sm:px-7 lg:px-9">
        <BentoCard>
          {gyms.isPending ? (
            <p role="status" className="text-sm text-[#5f5d55]">
              Cargando gimnasios…
            </p>
          ) : gyms.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-sm">No pudimos cargar los gimnasios.</p>
              <button
                type="button"
                disabled={gyms.isFetching}
                onClick={() => void gyms.refetch()}
                className="bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Reintentar
              </button>
            </div>
          ) : gyms.data.length === 0 ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm font-semibold">
                Todavía no hay gimnasios afiliados.
              </p>
              <p className="text-sm text-[#5f5d55]">
                Cuando des de alta el primero, vas a ver acá su estado y el de
                la invitación a su administrador.
              </p>
            </div>
          ) : (
            <ul
              aria-label="Gimnasios"
              className="overflow-hidden rounded-2xl border border-[#292823]/8"
            >
              {gyms.data.map((gym) => (
                <FilaGimnasio key={gym.id} gym={gym} />
              ))}
            </ul>
          )}
        </BentoCard>
      </main>
    </div>
  );
}
