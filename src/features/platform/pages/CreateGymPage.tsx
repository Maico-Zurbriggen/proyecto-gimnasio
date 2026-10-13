import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ApiError, apiMessage, fieldErrors } from '../../../api/client';
import {
  fetchTimezones,
  gymsQueryKey,
  provisionGym,
  timezonesQueryKey,
  type ProvisionGymInput,
} from '../../../api/gyms';
import { Banner } from '../../../shared/components/Banner';
import { formatDate } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';

type Campo = keyof ProvisionGymInput;
type Errores = Partial<Record<Campo, string[]>>;

const INPUT_CLASS =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-graphite';

/** Validación de forma del correo; la definitiva es del backend. */
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validar(form: ProvisionGymInput): Errores {
  const errores: Errores = {};
  if (!form.nombre.trim()) {
    errores.nombre = ['Ingresá el nombre del gimnasio.'];
  }
  if (!form.zonaHoraria) {
    errores.zonaHoraria = ['Elegí la zona horaria.'];
  }
  if (!form.correoAdministrador.trim()) {
    errores.correoAdministrador = ['Ingresá el correo del administrador.'];
  } else if (!FORMATO_CORREO.test(form.correoAdministrador.trim())) {
    errores.correoAdministrador = [
      'El correo no tiene un formato válido (ejemplo: nombre@gimnasio.com).',
    ];
  }
  return errores;
}

function mensajeDeFalla(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'invitation_delivery_failed') {
      return 'No se pudo enviar el correo al administrador, así que el gimnasio no se creó. Probá de nuevo en unos minutos.';
    }
    if (error.status === 403) {
      return 'Tu cuenta no tiene permiso para dar de alta gimnasios.';
    }
  }
  return (
    apiMessage(error) ??
    'No pudimos crear el gimnasio. Revisá tu conexión e intentá de nuevo; no se creó nada.'
  );
}

/**
 * Alta de un gimnasio afiliado (HU13 - T1).
 *
 * La zona horaria se elige de la lista que reconoce la base (identificadores
 * IANA); no se puede escribir un valor libre. El backend crea el gimnasio y la
 * invitación de su primer administrador en una sola operación: si algo falla,
 * no se informa ningún gimnasio como creado.
 */
export function CreateGymPage() {
  const ids = useId();
  const queryClient = useQueryClient();
  const timezones = useQuery({
    queryKey: timezonesQueryKey,
    queryFn: ({ signal }) => fetchTimezones(signal),
    staleTime: Infinity,
  });

  const vacio: ProvisionGymInput = {
    nombre: '',
    zonaHoraria: '',
    correoAdministrador: '',
  };
  const [form, setForm] = useState<ProvisionGymInput>(vacio);
  const [errores, setErrores] = useState<Errores>({});

  const alta = useMutation({
    mutationFn: provisionGym,
    onSuccess: async () => {
      setForm(vacio);
      await queryClient.invalidateQueries({ queryKey: gymsQueryKey });
    },
    onError: (error) => {
      setErrores(fieldErrors(error));
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (alta.isPending) return;
    const locales = validar(form);
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;
    alta.reset();
    alta.mutate({
      nombre: form.nombre.trim(),
      zonaHoraria: form.zonaHoraria,
      correoAdministrador: form.correoAdministrador.trim(),
    });
  };

  const campo = (
    nombre: Campo,
    etiqueta: string,
    control: (props: {
      id: string;
      'aria-invalid'?: boolean;
      'aria-describedby'?: string;
      className: string;
    }) => ReactNode,
    ayuda?: string,
  ) => {
    const id = `${ids}-${nombre}`;
    const conError = Boolean(errores[nombre]?.length);
    const describedBy = [
      ayuda ? `${id}-ayuda` : '',
      conError ? `${id}-error` : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="eyebrow text-[#5f5d55]">
          {etiqueta} <span aria-hidden="true">*</span>
        </label>
        {control({
          id,
          'aria-invalid': conError || undefined,
          'aria-describedby': describedBy || undefined,
          className: `${INPUT_CLASS} ${conError ? 'border-coral-strong' : 'border-[#292823]/15'}`,
        })}
        {ayuda ? (
          <p id={`${id}-ayuda`} className="text-xs text-[#5f5d55]">
            {ayuda}
          </p>
        ) : null}
        {conError ? (
          <p
            id={`${id}-error`}
            className="text-coral-text text-xs font-semibold"
          >
            <span aria-hidden="true">✕ </span>
            {errores[nombre]?.join(' ')}
          </p>
        ) : null}
      </div>
    );
  };

  const fallaGeneral =
    alta.isError && Object.keys(fieldErrors(alta.error)).length === 0;

  return (
    <div>
      <PageHeader
        kicker="Gimnasios"
        title="Alta de gimnasio."
        description="El gimnasio queda creado con su zona horaria y la invitación a su primer administrador."
      />
      <main className="px-4 pb-10 sm:px-7 lg:px-9">
        <BentoCard className="max-w-xl">
          {alta.isSuccess ? (
            <div className="mb-5">
              <Banner variant="info" title="Gimnasio creado">
                <p>
                  {alta.data.name} quedó dado de alta. Enviamos la invitación al
                  primer administrador a{' '}
                  <strong>{alta.data.invitationSentTo}</strong>; vence el{' '}
                  {formatDate(alta.data.invitationExpiresAt)}.
                </p>
              </Banner>
            </div>
          ) : null}

          {fallaGeneral ? (
            <p
              role="alert"
              className="text-coral-text mb-4 text-sm font-semibold"
            >
              {mensajeDeFalla(alta.error)}
            </p>
          ) : null}

          <form
            noValidate
            aria-label="Alta de gimnasio"
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            {campo('nombre', 'Nombre del gimnasio', (props) => (
              <input
                {...props}
                type="text"
                required
                aria-required="true"
                maxLength={120}
                value={form.nombre}
                onChange={(event) =>
                  setForm({ ...form, nombre: event.target.value })
                }
              />
            ))}

            {campo(
              'zonaHoraria',
              'Zona horaria',
              (props) => (
                <select
                  {...props}
                  required
                  aria-required="true"
                  disabled={!timezones.data}
                  value={form.zonaHoraria}
                  onChange={(event) =>
                    setForm({ ...form, zonaHoraria: event.target.value })
                  }
                >
                  <option value="">
                    {timezones.isPending
                      ? 'Cargando zonas horarias…'
                      : 'Elegí una zona horaria'}
                  </option>
                  {(timezones.data ?? []).map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              ),
              'Define el día y la semana de todos los usuarios del gimnasio. Ejemplo: America/Argentina/Cordoba.',
            )}
            {timezones.isError ? (
              <div role="alert" className="flex items-center gap-3 text-xs">
                <span>No pudimos cargar las zonas horarias.</span>
                <button
                  type="button"
                  onClick={() => void timezones.refetch()}
                  className="rounded-full border border-[#292823]/15 px-3 py-1 font-bold"
                >
                  Reintentar
                </button>
              </div>
            ) : null}

            {campo(
              'correoAdministrador',
              'Correo del primer administrador',
              (props) => (
                <input
                  {...props}
                  type="email"
                  autoComplete="off"
                  required
                  aria-required="true"
                  value={form.correoAdministrador}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      correoAdministrador: event.target.value,
                    })
                  }
                />
              ),
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={alta.isPending}
                aria-busy={alta.isPending}
                className="bg-graphite rounded-full px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {alta.isPending ? 'Creando gimnasio…' : 'Crear gimnasio'}
              </button>
              <Link
                to="/superadmin"
                className="text-sm font-bold text-[#3d3c36] underline underline-offset-2"
              >
                Ver gimnasios
              </Link>
            </div>
            <p className="text-[11px] text-[#5f5d55]">
              <span aria-hidden="true">*</span> Campos obligatorios.
            </p>
          </form>
        </BentoCard>
      </main>
    </div>
  );
}
