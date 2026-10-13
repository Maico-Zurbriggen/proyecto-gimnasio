import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { ApiError, apiMessage, fieldErrors } from '../../../api/client';
import {
  fetchGyms,
  fetchTimezones,
  gymsQueryKey,
  reissueBootstrapInvitation,
  setGymStatus,
  timezonesQueryKey,
  updateGym,
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

const BOTON_SECUNDARIO =
  'rounded-full border border-[#292823]/15 bg-white px-3 py-1.5 text-xs font-bold transition hover:bg-[#faf9f4] disabled:opacity-60';

/**
 * Edición del gimnasio (HU13 - criterios 22 y 23). Si cambia la zona horaria y
 * ya hay sesiones registradas, el backend pide confirmarlo explícitamente.
 */
function EditarGimnasio({
  gym,
  onClose,
}: {
  gym: GymSummary;
  onClose: () => void;
}) {
  const ids = useId();
  const queryClient = useQueryClient();
  const timezones = useQuery({
    queryKey: timezonesQueryKey,
    queryFn: ({ signal }) => fetchTimezones(signal),
    staleTime: Infinity,
  });
  const [nombre, setNombre] = useState(gym.name);
  const [zona, setZona] = useState(gym.timezone);
  const [confirmado, setConfirmado] = useState(false);

  const guardar = useMutation({
    mutationFn: () =>
      updateGym(gym.id, {
        ...(nombre.trim() !== gym.name ? { nombre: nombre.trim() } : {}),
        ...(zona !== gym.timezone ? { zonaHoraria: zona } : {}),
        ...(confirmado ? { confirmarCambioDeZona: true } : {}),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: gymsQueryKey });
      onClose();
    },
  });

  const pideConfirmacion =
    guardar.error instanceof ApiError &&
    guardar.error.code === 'timezone_change_requires_confirmation';
  const errores = fieldErrors(guardar.error);
  const sinCambios = nombre.trim() === gym.name && zona === gym.timezone;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nombre.trim() || sinCambios) return;
    guardar.mutate();
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label={`Editar ${gym.name}`}
      className="mt-3 flex w-full flex-col gap-3 rounded-xl border border-[#292823]/10 bg-white p-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-nombre`} className="eyebrow text-[#5f5d55]">
          Nombre
        </label>
        <input
          id={`${ids}-nombre`}
          value={nombre}
          maxLength={120}
          aria-invalid={errores.nombre || !nombre.trim() ? true : undefined}
          onChange={(event) => setNombre(event.target.value)}
          className="rounded-xl border border-[#292823]/15 px-3 py-2 text-sm"
        />
        {!nombre.trim() ? (
          <p className="text-coral-text text-xs font-semibold">
            El nombre es obligatorio.
          </p>
        ) : null}
        {errores.nombre ? (
          <p className="text-coral-text text-xs font-semibold">
            {errores.nombre.join(' ')}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-zona`} className="eyebrow text-[#5f5d55]">
          Zona horaria
        </label>
        <select
          id={`${ids}-zona`}
          value={zona}
          onChange={(event) => {
            setZona(event.target.value);
            setConfirmado(false);
          }}
          className="rounded-xl border border-[#292823]/15 px-3 py-2 text-sm"
        >
          {(timezones.data ?? [gym.timezone]).map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        {errores.zonaHoraria ? (
          <p className="text-coral-text text-xs font-semibold">
            {errores.zonaHoraria.join(' ')}
          </p>
        ) : null}
      </div>
      {pideConfirmacion ? (
        <div
          role="alert"
          className="rounded-xl bg-[#fdf3e0] p-3 text-xs text-[#5a3d0c]"
        >
          <p className="font-semibold">{apiMessage(guardar.error)}</p>
          <label className="mt-2 flex items-start gap-2 font-medium">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={confirmado}
              onChange={(event) => setConfirmado(event.target.checked)}
            />
            Entiendo el impacto y quiero cambiar la zona horaria.
          </label>
        </div>
      ) : null}
      {guardar.isError &&
      !pideConfirmacion &&
      !errores.nombre &&
      !errores.zonaHoraria ? (
        <p role="alert" className="text-coral-text text-xs font-semibold">
          No se pudo guardar. Probá de nuevo.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={
            guardar.isPending ||
            sinCambios ||
            !nombre.trim() ||
            (pideConfirmacion && !confirmado)
          }
          className="bg-graphite rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button type="button" onClick={onClose} className={BOTON_SECUNDARIO}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Suspensión o reactivación (criterio 22): no borra ningún dato. */
function CambiarEstado({ gym }: { gym: GymSummary }) {
  const queryClient = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);
  const activo = gym.status === 'ACTIVO';
  const cambiar = useMutation({
    mutationFn: () => setGymStatus(gym.id, !activo),
    onSuccess: async () => {
      setConfirmando(false);
      await queryClient.invalidateQueries({ queryKey: gymsQueryKey });
    },
  });

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className={BOTON_SECUNDARIO}
      >
        {activo ? 'Suspender' : 'Reactivar'}
      </button>
    );
  }
  return (
    <div
      role="alertdialog"
      aria-label={activo ? 'Confirmar suspensión' : 'Confirmar reactivación'}
      className="flex max-w-xs flex-col gap-2 rounded-xl bg-[#fbe7e5] p-3 text-xs text-[#7a2a20]"
    >
      <p className="font-semibold">
        {activo
          ? 'Sus usuarios no van a poder ingresar mientras esté suspendido. No se borra ningún dato.'
          : 'Sus usuarios van a poder volver a ingresar.'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={cambiar.isPending}
          onClick={() => cambiar.mutate()}
          className="bg-graphite rounded-full px-3 py-1.5 font-bold text-white disabled:opacity-60"
        >
          {cambiar.isPending
            ? 'Guardando…'
            : activo
              ? 'Confirmar suspensión'
              : 'Confirmar reactivación'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className={BOTON_SECUNDARIO}
        >
          Cancelar
        </button>
      </div>
      {cambiar.isError ? <p>No se pudo cambiar el estado.</p> : null}
    </div>
  );
}

function FilaGimnasio({ gym }: { gym: GymSummary }) {
  const [editando, setEditando] = useState(false);
  const invitacion = gym.bootstrapInvitation;
  const estado = invitacion ? ESTADO_INVITACION[invitacion.status] : null;

  return (
    <li className="flex flex-col flex-wrap gap-3 border-b border-[#292823]/7 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-bold break-words">{gym.name}</p>
        <p className="mt-1 text-xs text-[#5f5d55] break-words">
          {gym.timezone} · alta {formatDate(gym.createdAt)} ·{' '}
          {gym.status === 'ACTIVO' ? (
            'Activo'
          ) : (
            <strong className="text-coral-text">
              <span aria-hidden="true">⏸ </span>Suspendido
            </strong>
          )}
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
        <div className="flex flex-wrap gap-2">
          {editando ? null : (
            <button
              type="button"
              onClick={() => setEditando(true)}
              className={BOTON_SECUNDARIO}
            >
              Editar
            </button>
          )}
          <CambiarEstado gym={gym} />
        </div>
      </div>
      {editando ? (
        <EditarGimnasio gym={gym} onClose={() => setEditando(false)} />
      ) : null}
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
