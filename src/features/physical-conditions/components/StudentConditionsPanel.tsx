import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';

import { ApiError, apiMessage } from '../../../api/client';
import {
  JOINTS,
  MUSCLE_GROUPS,
  SEVERITIES,
  closeCondition,
  conditionsQueryKey,
  conditionsStatusQueryKey,
  declareCondition,
  declareNoConditions,
  fetchConditions,
  fetchConditionsStatus,
  type PhysicalCondition,
  type Severity,
} from '../../../api/conditions';
import {
  grantHealthConsent,
  studentContextQueryKey,
} from '../../../api/studentContext';
import { formatDate } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { ConditionsList } from './ConditionsList';

const BOTON =
  'bg-graphite rounded-full px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60';
const BOTON_SECUNDARIO =
  'rounded-full border border-[#292823]/15 bg-white px-3 py-1.5 text-xs font-bold transition hover:bg-[#faf9f4] disabled:opacity-60';
const CAMPO =
  'focus:border-graphite w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium outline-none';

function hoy(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Cerrar una condición vigente, con confirmación (criterio front 11). */
function CerrarCondicion({
  studentId,
  condition,
}: {
  studentId: string;
  condition: PhysicalCondition;
}) {
  const queryClient = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);
  const cerrar = useMutation({
    mutationFn: () => closeCondition(studentId, condition.id),
    onSuccess: async () => {
      setConfirmando(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: conditionsQueryKey(studentId),
        }),
        queryClient.invalidateQueries({
          queryKey: conditionsStatusQueryKey(studentId),
        }),
      ]);
    },
  });

  // La base exige fin posterior al inicio, y el backend cuenta días en UTC:
  // una condición que empezó hoy recién se puede cerrar mañana.
  if (condition.startsOn >= new Date().toISOString().slice(0, 10)) {
    return (
      <p className="text-xs text-[#5f5d55]">
        La declaraste hoy: podés cerrarla desde mañana.
      </p>
    );
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className={`${BOTON_SECUNDARIO} self-start`}
      >
        Cerrar condición
      </button>
    );
  }
  return (
    <div
      role="alertdialog"
      aria-label="Confirmar cierre de la condición"
      className="flex flex-col gap-2 rounded-xl bg-[#faf9f4] p-3 text-xs"
    >
      <p className="font-semibold">
        La condición deja de restringir tu entrenamiento desde hoy. Queda en tu
        historial. ¿Cerrarla?
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={cerrar.isPending}
          onClick={() => cerrar.mutate()}
          className="bg-graphite rounded-full px-3 py-1.5 font-bold text-white disabled:opacity-60"
        >
          {cerrar.isPending ? 'Cerrando…' : 'Sí, cerrar'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className={BOTON_SECUNDARIO}
        >
          Cancelar
        </button>
      </div>
      {cerrar.isError ? (
        <p role="alert" className="text-coral-text font-semibold">
          {apiMessage(cerrar.error) ?? 'No se pudo cerrar. Probá de nuevo.'}
        </p>
      ) : null}
    </div>
  );
}

/** Formulario de declaración (HU11 - T3, criterios front 1 a 7). */
function DeclararCondicion({
  studentId,
  onDeclared,
}: {
  studentId: string;
  onDeclared: () => Promise<void>;
}) {
  const ids = useId();
  const [zona, setZona] = useState('');
  const [severidad, setSeveridad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [desde, setDesde] = useState(hoy());
  const [confirmando, setConfirmando] = useState(false);
  const [errores, setErrores] = useState<{ zona?: string; severidad?: string }>(
    {},
  );
  const declarar = useMutation({
    mutationFn: () =>
      declareCondition(studentId, {
        bodyZoneCode: zona,
        severity: severidad as Severity,
        description: descripcion.trim() || undefined,
        startsOn: desde,
      }),
    onSuccess: async () => {
      setZona('');
      setSeveridad('');
      setDescripcion('');
      setDesde(hoy());
      setConfirmando(false);
      await onDeclared();
    },
  });

  const revisar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const locales: { zona?: string; severidad?: string } = {};
    if (!zona) locales.zona = 'Elegí la zona corporal.';
    if (!severidad) locales.severidad = 'Elegí la severidad.';
    setErrores(locales);
    if (Object.keys(locales).length === 0) setConfirmando(true);
  };

  const idZona = `${ids}-zona`;
  const idSeveridad = `${ids}-severidad`;

  return (
    <form
      noValidate
      aria-label="Declarar una condición física"
      onSubmit={revisar}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idZona} className="eyebrow text-[#5f5d55]">
          Zona corporal <span aria-hidden="true">*</span>
        </label>
        <select
          id={idZona}
          required
          aria-required="true"
          aria-invalid={errores.zona ? true : undefined}
          aria-describedby={errores.zona ? `${idZona}-error` : undefined}
          value={zona}
          onChange={(event) => setZona(event.target.value)}
          className={`${CAMPO} ${errores.zona ? 'border-coral-strong' : 'border-[#292823]/15'}`}
        >
          <option value="">Elegí una zona</option>
          <optgroup label="Músculos">
            {MUSCLE_GROUPS.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Articulaciones">
            {JOINTS.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </optgroup>
        </select>
        {errores.zona ? (
          <p
            id={`${idZona}-error`}
            className="text-coral-text text-xs font-semibold"
          >
            <span aria-hidden="true">✕ </span>
            {errores.zona}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={idSeveridad} className="eyebrow text-[#5f5d55]">
          Severidad <span aria-hidden="true">*</span>
        </label>
        <select
          id={idSeveridad}
          required
          aria-required="true"
          aria-invalid={errores.severidad ? true : undefined}
          aria-describedby={`${idSeveridad}-ayuda${errores.severidad ? ` ${idSeveridad}-error` : ''}`}
          value={severidad}
          onChange={(event) => setSeveridad(event.target.value)}
          className={`${CAMPO} ${errores.severidad ? 'border-coral-strong' : 'border-[#292823]/15'}`}
        >
          <option value="">Elegí la severidad</option>
          {SEVERITIES.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <p id={`${idSeveridad}-ayuda`} className="text-xs text-[#5f5d55]">
          Leve: se señala en la rutina. Moderada o severa: impide los ejercicios
          que comprometen esa zona.
        </p>
        {errores.severidad ? (
          <p
            id={`${idSeveridad}-error`}
            className="text-coral-text text-xs font-semibold"
          >
            <span aria-hidden="true">✕ </span>
            {errores.severidad}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${ids}-desde`} className="eyebrow text-[#5f5d55]">
          Desde
        </label>
        <input
          id={`${ids}-desde`}
          type="date"
          max={hoy()}
          value={desde}
          onChange={(event) => setDesde(event.target.value)}
          className={`${CAMPO} border-[#292823]/15`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${ids}-descripcion`}
          className="eyebrow text-[#5f5d55]"
        >
          Descripción (opcional)
        </label>
        <textarea
          id={`${ids}-descripcion`}
          rows={2}
          maxLength={500}
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          className={`${CAMPO} border-[#292823]/15`}
        />
      </div>

      {confirmando ? (
        <div
          role="alertdialog"
          aria-label="Confirmar declaración"
          className="flex flex-col gap-2 rounded-xl border border-[#b8790c]/30 bg-[#fdf3e0] p-3 text-xs text-[#5a3d0c]"
        >
          {/* Criterio front 7: informar el efecto antes de confirmar. */}
          <p className="font-semibold">
            Declarar esta condición puede marcar ejercicios de tu rutina y
            generar una propuesta de ajuste para tu entrenador.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={declarar.isPending}
              aria-busy={declarar.isPending}
              onClick={() => declarar.mutate()}
              className="bg-graphite rounded-full px-3 py-1.5 font-bold text-white disabled:opacity-60"
            >
              {declarar.isPending ? 'Guardando…' : 'Confirmar declaración'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className={BOTON_SECUNDARIO}
            >
              Volver
            </button>
          </div>
        </div>
      ) : (
        <button type="submit" className={`${BOTON} self-start`}>
          Declarar condición
        </button>
      )}
      {declarar.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-coral-text font-semibold">
            {apiMessage(declarar.error) ?? 'No se pudo guardar la condición.'}
          </span>
          <button
            type="button"
            onClick={() => declarar.mutate()}
            className={BOTON_SECUNDARIO}
          >
            Reintentar
          </button>
        </div>
      ) : null}
    </form>
  );
}

/**
 * Condiciones físicas del propio alumno (HU11 - T3): consentimiento, "no
 * tengo ninguna", alta, listado e historial.
 */
export function StudentConditionsPanel({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: conditionsStatusQueryKey(studentId),
    queryFn: ({ signal }) => fetchConditionsStatus(studentId, signal),
  });
  const conditions = useQuery({
    queryKey: conditionsQueryKey(studentId),
    queryFn: ({ signal }) => fetchConditions(studentId, signal),
    enabled: status.data?.healthDataConsent === true,
  });
  // El estado (consentimiento, "ninguna") cambia junto con el listado.
  const refrescar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: conditionsQueryKey(studentId),
      }),
      queryClient.invalidateQueries({
        queryKey: conditionsStatusQueryKey(studentId),
      }),
    ]);
  };

  const consentir = useMutation({
    mutationFn: grantHealthConsent,
    onSuccess: async () => {
      // La puesta en contexto también depende del consentimiento.
      await Promise.all([
        refrescar(),
        queryClient.invalidateQueries({ queryKey: studentContextQueryKey }),
      ]);
    },
  });
  const ninguna = useMutation({
    mutationFn: () => declareNoConditions(studentId),
    onSuccess: refrescar,
  });

  return (
    <BentoCard>
      <h2 className="eyebrow text-[#5f5d55]">Condiciones físicas</h2>
      <p className="mt-2 text-sm text-[#55534c]">
        Lesiones o molestias que tu entrenador tiene que tener en cuenta.
      </p>

      {status.isPending ? (
        <p role="status" className="mt-4 text-sm text-[#5f5d55]">
          Cargando…
        </p>
      ) : status.isError ? (
        <div role="alert" className="mt-4 flex flex-col items-start gap-3">
          <p className="text-sm">No pudimos cargar tus condiciones.</p>
          <button
            type="button"
            onClick={() => void status.refetch()}
            className={BOTON}
          >
            Reintentar
          </button>
        </div>
      ) : !status.data.healthDataConsent ? (
        // Criterio front 3: sin consentimiento el formulario no se habilita.
        <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-[#b8790c]/30 bg-[#fdf3e0] p-4 text-sm text-[#5a3d0c]">
          <p className="font-semibold">
            Para declarar condiciones necesitamos tu consentimiento para tratar
            datos de salud.
          </p>
          <p>
            Sin él, tu entrenador no puede tener en cuenta lesiones ni molestias
            al armar tu rutina.
          </p>
          <button
            type="button"
            disabled={consentir.isPending}
            onClick={() => consentir.mutate()}
            className={BOTON}
          >
            {consentir.isPending ? 'Guardando…' : 'Dar mi consentimiento'}
          </button>
          {consentir.isError ? (
            <p role="alert" className="text-coral-text font-semibold">
              No se pudo registrar. Probá de nuevo.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          {conditions.isPending ? (
            <p role="status" className="text-sm text-[#5f5d55]">
              Cargando condiciones…
            </p>
          ) : conditions.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-sm">No pudimos cargar tus condiciones.</p>
              <button
                type="button"
                onClick={() => void conditions.refetch()}
                className={BOTON}
              >
                Reintentar
              </button>
            </div>
          ) : (
            <>
              {conditions.data.length === 0 ? (
                // Criterio front 10: "no respondió" vs "declaró ninguna".
                status.data.declaredNone ? (
                  <p className="rounded-xl bg-lime-soft p-3 text-sm text-[#3b4d14]">
                    <span aria-hidden="true">✓ </span>
                    Declaraste que no tenés ninguna condición física
                    {status.data.declaredNoneAt
                      ? ` (${formatDate(status.data.declaredNoneAt)})`
                      : ''}
                    .
                  </p>
                ) : (
                  <p className="text-sm text-[#5f5d55]">
                    Todavía no respondiste. Si no tenés ninguna, indicalo para
                    que tu entrenador lo sepa.
                  </p>
                )
              ) : (
                <ConditionsList
                  conditions={conditions.data}
                  action={(c) => (
                    <CerrarCondicion studentId={studentId} condition={c} />
                  )}
                />
              )}

              {conditions.data.every((c) => c.endsOn !== null) &&
              !status.data.declaredNone ? (
                <div className="flex flex-col items-start gap-2">
                  <button
                    type="button"
                    disabled={ninguna.isPending}
                    onClick={() => ninguna.mutate()}
                    className={BOTON_SECUNDARIO}
                  >
                    {ninguna.isPending
                      ? 'Guardando…'
                      : 'No tengo ninguna condición física'}
                  </button>
                  {ninguna.isError ? (
                    <p
                      role="alert"
                      className="text-coral-text text-xs font-semibold"
                    >
                      {ninguna.error instanceof ApiError
                        ? (apiMessage(ninguna.error) ?? 'No se pudo guardar.')
                        : 'No se pudo guardar.'}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="border-t border-[#292823]/8 pt-5">
                <h3 className="eyebrow mb-3 text-[#5f5d55]">
                  Declarar una condición
                </h3>
                <DeclararCondicion
                  studentId={studentId}
                  onDeclared={refrescar}
                />
              </div>
            </>
          )}
        </div>
      )}
    </BentoCard>
  );
}
