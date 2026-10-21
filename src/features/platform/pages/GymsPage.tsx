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
    clase: 'chip-warn',
  },
  USADA: {
    texto: 'Administrador activo',
    icono: '✓',
    clase: 'chip-ok',
  },
  VENCIDA: {
    texto: 'Invitación vencida',
    icono: '!',
    clase: 'chip-danger',
  },
  REVOCADA: {
    texto: 'Invitación revocada',
    icono: '✕',
    clase: 'chip-danger',
  },
};

function ReenviarInvitacion({ gym }: { gym: GymSummary }) {
  const queryClient = useQueryClient();
  const reenviar = useMutation({
    mutationFn: () => reissueBootstrapInvitation(gym.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gymsQueryKey }),
  });

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        disabled={reenviar.isPending}
        aria-busy={reenviar.isPending}
        onClick={() => reenviar.mutate()}
        className="btn-secondary btn-sm"
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

const BOTON_SECUNDARIO = 'btn-secondary btn-sm';

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
      className="surface-muted mt-3 flex w-full flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-nombre`} className="field-label">
          Nombre
        </label>
        <input
          id={`${ids}-nombre`}
          value={nombre}
          maxLength={120}
          aria-invalid={errores.nombre || !nombre.trim() ? true : undefined}
          onChange={(event) => setNombre(event.target.value)}
          className="field"
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
        <label htmlFor={`${ids}-zona`} className="field-label">
          Zona horaria
        </label>
        <select
          id={`${ids}-zona`}
          value={zona}
          onChange={(event) => {
            setZona(event.target.value);
            setConfirmado(false);
          }}
          className="field"
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
              className="check mt-0.5"
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
          className="btn-primary btn-sm"
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
          className="btn-danger btn-sm"
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
    <li className="card-interactive flex flex-col flex-wrap gap-3 rounded-2xl border border-[#292823]/8 bg-white/70 p-4 hover:bg-white sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-bold break-words">{gym.name}</p>
        <p className="mt-1 text-xs text-[#77756d] break-words">
          {gym.timezone} · alta {formatDate(gym.createdAt)} ·{' '}
          {gym.status === 'ACTIVO' ? (
            <span className="chip-ok">Activo</span>
          ) : (
            <strong className="chip-danger">
              <span aria-hidden="true">⏸ </span>Suspendido
            </strong>
          )}
        </p>
        {invitacion ? (
          <p className="mt-1 text-xs break-all text-[#77756d]">
            Primer administrador: {invitacion.email}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        {estado ? (
          <span className={estado.clase}>
            <span aria-hidden="true">{estado.icono} </span>
            {estado.texto}
          </span>
        ) : (
          <span className="text-[11px] text-[#77756d]">
            {gym.administratorCount > 0
              ? 'Administrador activo'
              : 'Sin invitación de arranque'}
          </span>
        )}
        <div className="flex flex-wrap items-start gap-2 sm:justify-end">
          {invitacion && invitacion.status !== 'USADA' ? (
            <ReenviarInvitacion gym={gym} />
          ) : null}
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
          <Link to="/superadmin/gimnasios/nuevo" className="btn-primary">
            Dar de alta un gimnasio
          </Link>
        }
      />
      <main className="page-body">
        <BentoCard>
          {gyms.isPending ? (
            <p role="status" className="text-sm text-[#77756d]">
              Cargando gimnasios…
            </p>
          ) : gyms.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-sm">No pudimos cargar los gimnasios.</p>
              <button
                type="button"
                disabled={gyms.isFetching}
                onClick={() => void gyms.refetch()}
                className="btn-secondary btn-sm"
              >
                Reintentar
              </button>
            </div>
          ) : gyms.data.length === 0 ? (
            <div className="surface-muted flex flex-col items-center gap-2 py-10 text-center">
              <p className="text-sm font-semibold">
                Todavía no hay gimnasios afiliados.
              </p>
              <p className="text-sm text-[#77756d]">
                Cuando des de alta el primero, vas a ver acá su estado y el de
                la invitación a su administrador.
              </p>
            </div>
          ) : (
            <ul aria-label="Gimnasios" className="flex flex-col gap-3">
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
