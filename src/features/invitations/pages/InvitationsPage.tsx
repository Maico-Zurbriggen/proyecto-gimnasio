import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';

import { ApiError, apiMessage, fieldErrors } from '../../../api/client';
import {
  fetchInvitations,
  invitationsQueryKey,
  issueInvitation,
  type InvitableRole,
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

const ESTADO: Record<
  ListedInvitation['status'],
  { texto: string; clase: string }
> = {
  PENDIENTE: { texto: '◷ Pendiente', clase: 'bg-[#fdf3e0] text-[#5a3d0c]' },
  USADA: { texto: '✓ Cuenta creada', clase: 'bg-lime-soft text-[#3b4d14]' },
  VENCIDA: { texto: '! Vencida', clase: 'bg-[#fbe7e5] text-[#7a2a20]' },
  REVOCADA: { texto: '✕ Revocada', clase: 'bg-[#fbe7e5] text-[#7a2a20]' },
};

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Invitaciones del gimnasio (FL-19).
 *
 * El entrenador invita alumnos, que al crear su cuenta quedan asignados a él;
 * el administrador puede además invitar entrenadores y administradores. El
 * enlace llega por correo y lleva a la pantalla de alta (HU06).
 */
export function InvitationsPage({
  canChooseRoles,
}: {
  /** Sólo el administrador elige roles; el entrenador invita alumnos. */
  canChooseRoles: boolean;
}) {
  const ids = useId();
  const queryClient = useQueryClient();
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
      locales.email = ['El correo no tiene un formato válido.'];
    if (roles.length === 0) locales.roles = ['Elegí al menos un rol.'];
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;
    emitir.reset();
    emitir.mutate({ email: email.trim(), roles });
  };

  const idCorreo = `${ids}-correo`;
  const errorGeneral =
    emitir.isError && Object.keys(fieldErrors(emitir.error)).length === 0;

  return (
    <div>
      <PageHeader
        kicker="Invitaciones"
        title={
          canChooseRoles ? 'Sumá gente al gimnasio.' : 'Invitá a tus alumnos.'
        }
        description={
          canChooseRoles
            ? 'Le llega un enlace por correo para crear su cuenta con los roles que elijas.'
            : 'Le llega un enlace por correo para crear su cuenta, y queda asignado a vos como su profesor.'
        }
      />
      <main className="grid gap-4 px-4 pb-10 sm:px-7 lg:grid-cols-12 lg:px-9">
        <BentoCard className="lg:col-span-5">
          <p className="eyebrow text-[#5f5d55]">Nueva invitación</p>

          {emitir.isSuccess ? (
            <div className="mt-4">
              <Banner variant="info" title="Invitación enviada">
                <p>
                  Le enviamos el enlace a <strong>{emitir.data.email}</strong>.
                  Vence el {formatDate(emitir.data.expiresAt)}.
                </p>
              </Banner>
            </div>
          ) : null}
          {errorGeneral ? (
            <p
              role="alert"
              className="text-coral-text mt-4 text-sm font-semibold"
            >
              {emitir.error instanceof ApiError &&
              emitir.error.code === 'invitation_delivery_failed'
                ? 'No se pudo enviar el correo, así que la invitación no se creó. Probá de nuevo.'
                : (apiMessage(emitir.error) ??
                  'No pudimos enviar la invitación. Intentá de nuevo.')}
            </p>
          ) : null}

          <form
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
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium outline-none focus:border-graphite ${errores.email ? 'border-coral-strong' : 'border-[#292823]/15'}`}
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
            ) : null}

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

        <BentoCard className="lg:col-span-7">
          <p className="eyebrow text-[#5f5d55]">Invitaciones enviadas</p>
          {invitations.isPending ? (
            <p role="status" className="mt-4 text-sm text-[#5f5d55]">
              Cargando invitaciones…
            </p>
          ) : invitations.isError ? (
            <div role="alert" className="mt-4 flex flex-col items-start gap-3">
              <p className="text-sm">No pudimos cargar las invitaciones.</p>
              <button
                type="button"
                onClick={() => void invitations.refetch()}
                className="bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white"
              >
                Reintentar
              </button>
            </div>
          ) : invitations.data.length === 0 ? (
            <p className="mt-4 text-sm text-[#5f5d55]">
              Todavía no enviaste invitaciones.
            </p>
          ) : (
            <ul
              aria-label="Invitaciones enviadas"
              className="mt-4 overflow-hidden rounded-2xl border border-[#292823]/8"
            >
              {invitations.data.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 border-b border-[#292823]/7 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold break-all">{item.email}</p>
                    <p className="mt-0.5 text-xs text-[#5f5d55]">
                      {item.roles.map((r) => r.toLowerCase()).join(', ')} ·
                      enviada {formatDate(item.issuedAt)}
                      {canChooseRoles && item.issuedByName
                        ? ` por ${item.issuedByName}`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`self-start rounded-full px-2.5 py-1 text-[11px] font-bold sm:self-auto ${ESTADO[item.status].clase}`}
                  >
                    {ESTADO[item.status].texto}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>
      </main>
    </div>
  );
}
