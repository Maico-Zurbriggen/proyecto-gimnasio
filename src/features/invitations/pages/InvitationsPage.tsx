import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState, type FormEvent } from 'react';

import { ApiError, apiMessage, fieldErrors } from '../../../api/client';
import {
  fetchInvitations,
  invitationsQueryKey,
  issueInvitation,
  resendInvitation,
  revokeInvitation,
  type InvitableRole,
  type InvitationStatus,
  type ListedInvitation,
} from '../../../api/invitations';
import { Banner } from '../../../shared/components/Banner';
import { formatDate } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';

const ROLES: { value: InvitableRole; label: string }[] = [
  { value: 'ALUMNO', label: 'Alumno' },
  { value: 'ENTRENADOR', label: 'Entrenador' },
  { value: 'ADMINISTRADOR', label: 'Administrador' },
];

const ETIQUETA_ROL: Record<InvitableRole, string> = {
  ALUMNO: 'Alumno',
  ENTRENADOR: 'Entrenador',
  ADMINISTRADOR: 'Administrador',
};

/** Criterio front 2: el estado se lee como texto, además del color. */
const ESTADO: Record<
  InvitationStatus,
  { texto: string; icono: string; clase: string }
> = {
  VIGENTE: {
    texto: 'Vigente',
    icono: '◷',
    clase: 'bg-[#fdf3e0] text-[#5a3d0c]',
  },
  USADA: { texto: 'Usada', icono: '✓', clase: 'bg-lime-soft text-[#3b4d14]' },
  REVOCADA: {
    texto: 'Revocada',
    icono: '✕',
    clase: 'bg-[#fbe7e5] text-[#7a2a20]',
  },
  CADUCADA: {
    texto: 'Caducada',
    icono: '!',
    clase: 'bg-[#efede6] text-[#3d3c36]',
  },
};

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BOTON_SECUNDARIO =
  'rounded-full border border-[#292823]/15 bg-white px-3 py-1.5 text-xs font-bold transition hover:bg-[#faf9f4] disabled:opacity-60';

function EstadoChip({ status }: { status: InvitationStatus }) {
  const estado = ESTADO[status];
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${estado.clase}`}
    >
      <span aria-hidden="true">{estado.icono} </span>
      {estado.texto}
    </span>
  );
}

/** Motivo legible cuando el backend rechaza revocar o reenviar (criterio 13). */
function motivoDeRechazo(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'invitation_not_revocable') {
      return (
        apiMessage(error) ??
        'La invitación ya no está vigente: se usó, se revocó o venció.'
      );
    }
    if (error.code === 'forbidden_invitation_revocation') {
      return apiMessage(error) ?? 'Sólo quien la emitió puede gestionarla.';
    }
  }
  return 'No se pudo completar la operación. Probá de nuevo.';
}

/**
 * Revocar (con confirmación) y reenviar una invitación vigente (criterios
 * front 5, 12 a 14). Sólo se ofrecen en invitaciones VIGENTES.
 */
function AccionesInvitacion({ invitation }: { invitation: ListedInvitation }) {
  const queryClient = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);
  const refrescar = () =>
    queryClient.invalidateQueries({ queryKey: invitationsQueryKey });

  const revocar = useMutation({
    mutationFn: () => revokeInvitation(invitation.id),
    onSuccess: async () => {
      setConfirmando(false);
      await refrescar();
    },
    onError: async () => {
      setConfirmando(false);
      await refrescar();
    },
  });
  const reenviar = useMutation({
    mutationFn: () => resendInvitation(invitation.id),
    onError: refrescar,
  });

  if (invitation.status !== 'VIGENTE') {
    return revocar.isError ? (
      <p role="alert" className="text-coral-text text-xs font-semibold">
        {motivoDeRechazo(revocar.error)}
      </p>
    ) : null;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {confirmando ? (
        <div
          role="alertdialog"
          aria-label={`Confirmar revocación de ${invitation.email}`}
          className="flex flex-col gap-2 rounded-xl bg-[#fbe7e5] p-3 text-xs text-[#7a2a20]"
        >
          <p className="font-semibold">
            El enlace va a dejar de funcionar. ¿Revocar la invitación?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={revocar.isPending}
              onClick={() => revocar.mutate()}
              className="bg-graphite rounded-full px-3 py-1.5 font-bold text-white disabled:opacity-60"
            >
              {revocar.isPending ? 'Revocando…' : 'Sí, revocar'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className={BOTON_SECUNDARIO}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={reenviar.isPending}
            aria-busy={reenviar.isPending}
            onClick={() => reenviar.mutate()}
            className={BOTON_SECUNDARIO}
          >
            {reenviar.isPending ? 'Reenviando…' : 'Reenviar'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className={BOTON_SECUNDARIO}
          >
            Revocar
          </button>
        </div>
      )}
      <p aria-live="polite" className="text-xs">
        {reenviar.isSuccess
          ? reenviar.data.emailFailed
            ? 'No se pudo enviar el correo. Probá reenviar de nuevo.'
            : `Reenviada a ${invitation.email}. El enlace anterior ya no sirve.`
          : reenviar.isError
            ? motivoDeRechazo(reenviar.error)
            : revocar.isError
              ? motivoDeRechazo(revocar.error)
              : ''}
      </p>
    </div>
  );
}

/**
 * Gestión de invitaciones del gimnasio (HU08 - T3).
 *
 * El entrenador invita sólo alumnos, que quedan asignados a él al crear su
 * cuenta; el administrador elige uno o varios roles. El listado muestra correo,
 * roles, emisor, emisión, vencimiento y estado; revocar y reenviar sólo
 * aparecen en las vigentes. A 360 px la tabla se convierte en tarjetas.
 */
export function InvitationsPage({
  canChooseRoles,
}: {
  /** Sólo el administrador elige roles; el entrenador invita alumnos. */
  canChooseRoles: boolean;
}) {
  const ids = useId();
  const queryClient = useQueryClient();
  const correoRef = useRef<HTMLInputElement>(null);
  const invitations = useQuery({
    queryKey: invitationsQueryKey,
    queryFn: ({ signal }) => fetchInvitations(signal),
  });

  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<InvitableRole[]>(['ALUMNO']);
  const [errores, setErrores] = useState<Record<string, string[]>>({});

  const emitir = useMutation({
    mutationFn: issueInvitation,
    onSuccess: async () => {
      setEmail('');
      await queryClient.invalidateQueries({ queryKey: invitationsQueryKey });
    },
    onError: (error) => setErrores(fieldErrors(error)),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (emitir.isPending) return;
    const locales: Record<string, string[]> = {};
    if (!email.trim()) locales.email = ['Ingresá el correo de la persona.'];
    else if (!FORMATO_CORREO.test(email.trim()))
      locales.email = [
        'El correo no tiene un formato válido (ejemplo: nombre@correo.com).',
      ];
    const rolesAEnviar: InvitableRole[] = canChooseRoles ? roles : ['ALUMNO'];
    if (rolesAEnviar.length === 0) locales.roles = ['Elegí al menos un rol.'];
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;
    emitir.reset();
    emitir.mutate({ email: email.trim(), roles: rolesAEnviar });
  };

  const idCorreo = `${ids}-correo`;
  const idRol = `${ids}-rol`;
  const errorGeneral =
    emitir.isError && Object.keys(fieldErrors(emitir.error)).length === 0;
  const lista = invitations.data ?? [];

  return (
    <div>
      <PageHeader
        kicker="Invitaciones"
        title={
          canChooseRoles ? 'Sumá gente al gimnasio.' : 'Invitá a tus alumnos.'
        }
        description={
          canChooseRoles
            ? 'Le llega un enlace por correo para crear su cuenta con los roles que elijas. Vence a los 14 días.'
            : 'Le llega un enlace por correo para crear su cuenta, y queda asignado a vos como su profesor. Vence a los 14 días.'
        }
      />
      <main className="grid gap-4 px-4 pb-10 sm:px-7 lg:grid-cols-12 lg:px-9">
        <BentoCard className="lg:col-span-4">
          <h2 className="eyebrow text-[#5f5d55]">Nueva invitación</h2>

          {emitir.isSuccess ? (
            <div className="mt-4">
              {emitir.data.emailFailed ? (
                <Banner variant="warning" title="Invitación creada sin enviar">
                  <p>
                    La invitación a <strong>{emitir.data.email}</strong> quedó
                    vigente, pero el correo no salió. Usá{' '}
                    <strong>Reenviar</strong> en el listado.
                  </p>
                </Banner>
              ) : (
                <Banner variant="info" title="Invitación enviada">
                  <p>
                    Le enviamos el enlace a <strong>{emitir.data.email}</strong>
                    . Vence el {formatDate(emitir.data.expiresAt)}.
                  </p>
                </Banner>
              )}
            </div>
          ) : null}
          {errorGeneral ? (
            <p
              role="alert"
              className="text-coral-text mt-4 text-sm font-semibold"
            >
              {apiMessage(emitir.error) ??
                'No pudimos crear la invitación. Revisá tu conexión e intentá de nuevo.'}
            </p>
          ) : null}

          <form
            id={`${ids}-form`}
            noValidate
            aria-label="Nueva invitación"
            onSubmit={handleSubmit}
            className="mt-4 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idCorreo} className="eyebrow text-[#5f5d55]">
                Correo <span aria-hidden="true">*</span>
              </label>
              <input
                ref={correoRef}
                id={idCorreo}
                type="email"
                autoComplete="off"
                required
                aria-required="true"
                aria-invalid={errores.email ? true : undefined}
                aria-describedby={
                  errores.email ? `${idCorreo}-error` : undefined
                }
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`focus:border-graphite w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium outline-none ${errores.email ? 'border-coral-strong' : 'border-[#292823]/15'}`}
              />
              {errores.email ? (
                <p
                  id={`${idCorreo}-error`}
                  className="text-coral-text text-xs font-semibold"
                >
                  <span aria-hidden="true">✕ </span>
                  {errores.email.join(' ')}
                </p>
              ) : null}
            </div>

            {canChooseRoles ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="eyebrow mb-1 text-[#5f5d55]">
                  Roles <span aria-hidden="true">*</span>
                </legend>
                {ROLES.map((rol) => (
                  <label
                    key={rol.value}
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={roles.includes(rol.value)}
                      onChange={(event) =>
                        setRoles((actuales) =>
                          event.target.checked
                            ? [...actuales, rol.value]
                            : actuales.filter((r) => r !== rol.value),
                        )
                      }
                    />
                    {rol.label}
                  </label>
                ))}
                {errores.roles ? (
                  <p className="text-coral-text text-xs font-semibold">
                    <span aria-hidden="true">✕ </span>
                    {errores.roles.join(' ')}
                  </p>
                ) : null}
              </fieldset>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label htmlFor={idRol} className="eyebrow text-[#5f5d55]">
                  Rol
                </label>
                {/* Criterio front 8: el entrenador sólo puede invitar alumnos. */}
                <select
                  id={idRol}
                  value="ALUMNO"
                  disabled
                  aria-describedby={`${idRol}-ayuda`}
                  className="rounded-xl border border-[#292823]/15 bg-[#f4f3ee] px-3.5 py-2.5 text-sm font-medium"
                >
                  <option value="ALUMNO">Alumno</option>
                </select>
                <p id={`${idRol}-ayuda`} className="text-xs text-[#5f5d55]">
                  Como entrenador podés invitar sólo alumnos.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={emitir.isPending}
              aria-busy={emitir.isPending}
              className="bg-graphite self-start rounded-full px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {emitir.isPending ? 'Enviando…' : 'Enviar invitación'}
            </button>
          </form>
        </BentoCard>

        <BentoCard className="lg:col-span-8">
          <h2 className="eyebrow text-[#5f5d55]">Invitaciones enviadas</h2>
          {invitations.isPending ? (
            <p role="status" className="mt-4 text-sm text-[#5f5d55]">
              Cargando invitaciones…
            </p>
          ) : invitations.isError ? (
            <div role="alert" className="mt-4 flex flex-col items-start gap-3">
              <p className="text-sm">No pudimos cargar las invitaciones.</p>
              <button
                type="button"
                disabled={invitations.isFetching}
                onClick={() => void invitations.refetch()}
                className="bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Reintentar
              </button>
            </div>
          ) : lista.length === 0 ? (
            <div className="mt-4 flex flex-col items-start gap-3">
              <p className="text-sm font-semibold">
                Todavía no enviaste invitaciones.
              </p>
              <p className="text-sm text-[#5f5d55]">
                Cada persona recibe un enlace por correo para crear su cuenta.
              </p>
              <button
                type="button"
                onClick={() => correoRef.current?.focus()}
                className="bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white"
              >
                Crear la primera invitación
              </button>
            </div>
          ) : (
            <>
              {/* Escritorio: tabla. */}
              <div className="mt-4 hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Invitaciones enviadas</caption>
                  <thead className="text-xs text-[#5f5d55]">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Correo
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Roles
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Emisor
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Emisión
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Vence
                      </th>
                      <th scope="col" className="py-2 pr-3 font-semibold">
                        Estado
                      </th>
                      <th scope="col" className="py-2 font-semibold">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-[#292823]/8 align-top"
                      >
                        <td className="py-3 pr-3 font-semibold break-all">
                          {item.email}
                        </td>
                        <td className="py-3 pr-3">
                          {item.roles.map((r) => ETIQUETA_ROL[r]).join(', ')}
                        </td>
                        <td className="py-3 pr-3">
                          {item.issuedByName ?? '—'}
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          {formatDate(item.issuedAt)}
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          {formatDate(item.expiresAt)}
                        </td>
                        <td className="py-3 pr-3">
                          <EstadoChip status={item.status} />
                        </td>
                        <td className="py-3">
                          <AccionesInvitacion invitation={item} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Móvil (360 px): tarjetas, sin scroll horizontal. */}
              <ul
                aria-label="Invitaciones enviadas"
                className="mt-4 flex flex-col gap-3 md:hidden"
              >
                {lista.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 rounded-2xl border border-[#292823]/8 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold break-all">
                        {item.email}
                      </p>
                      <EstadoChip status={item.status} />
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-[#55534c]">
                      <dt className="font-semibold">Roles</dt>
                      <dd>
                        {item.roles.map((r) => ETIQUETA_ROL[r]).join(', ')}
                      </dd>
                      <dt className="font-semibold">Emisor</dt>
                      <dd>{item.issuedByName ?? '—'}</dd>
                      <dt className="font-semibold">Emisión</dt>
                      <dd>{formatDate(item.issuedAt)}</dd>
                      <dt className="font-semibold">Vence</dt>
                      <dd>{formatDate(item.expiresAt)}</dd>
                    </dl>
                    <AccionesInvitacion invitation={item} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </BentoCard>
      </main>
    </div>
  );
}
