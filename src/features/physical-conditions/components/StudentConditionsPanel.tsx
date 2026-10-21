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
      <p className="field-hint">
        La declaraste hoy: podés cerrarla desde mañana.
      </p>
    );
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="btn-secondary btn-sm self-start"
      >
        Cerrar condición
      </button>
    );
  }
  return (
    <div
      role="alertdialog"
      aria-label="Confirmar cierre de la condición"
      className="surface-muted flex flex-col gap-2 text-xs"
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
          className="btn-primary btn-sm"
        >
          {cerrar.isPending ? 'Cerrando…' : 'Sí, cerrar'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="btn-secondary btn-sm"
        >
          Cancelar
        </button>
      </div>
      {cerrar.isError ? (
        <p role="alert" className="field-error">
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
        <label htmlFor={idZona} className="field-label">
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
          className="field"
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
          <p id={`${idZona}-error`} className="field-error">
            <span aria-hidden="true">✕ </span>
            {errores.zona}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={idSeveridad} className="field-label">
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
          className="field"
        >
          <option value="">Elegí la severidad</option>
          {SEVERITIES.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <p id={`${idSeveridad}-ayuda`} className="field-hint">
          Leve: se señala en la rutina. Moderada o severa: impide los ejercicios
          que comprometen esa zona.
        </p>
        {errores.severidad ? (
          <p id={`${idSeveridad}-error`} className="field-error">
            <span aria-hidden="true">✕ </span>
            {errores.severidad}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${ids}-desde`} className="field-label">
          Desde
        </label>
        <input
          id={`${ids}-desde`}
          type="date"
          max={hoy()}
          value={desde}
          onChange={(event) => setDesde(event.target.value)}
          className="field"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${ids}-descripcion`} className="field-label">
          Descripción (opcional)
        </label>
        <textarea
          id={`${ids}-descripcion`}
          rows={2}
          maxLength={500}
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          className="field"
        />
      </div>

      {confirmando ? (
        <div
          role="alertdialog"
          aria-label="Confirmar declaración"
          className="surface-muted flex flex-col gap-2 text-xs text-[#5a3d0c]"
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
              className="btn-primary btn-sm"
            >
              {declarar.isPending ? 'Guardando…' : 'Confirmar declaración'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="btn-secondary btn-sm"
            >
              Volver
            </button>
          </div>
        </div>
      ) : (
        <button type="submit" className="btn-primary self-start">
          Declarar condición
        </button>
      )}
      {declarar.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-xs">
          <span className="field-error">
            {apiMessage(declarar.error) ?? 'No se pudo guardar la condición.'}
          </span>
          <button
            type="button"
            onClick={() => declarar.mutate()}
            className="btn-secondary btn-sm"
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
      <h2 className="font-display text-lg font-semibold tracking-tight">
        Condiciones físicas
      </h2>
      <p className="mt-2 text-sm text-[#68675f]">
        Lesiones o molestias que tu entrenador tiene que tener en cuenta.
      </p>

      {status.isPending ? (
        <p role="status" className="mt-4 text-sm text-[#68675f]">
          Cargando…
        </p>
      ) : status.isError ? (
        <div role="alert" className="mt-4 flex flex-col items-start gap-3">
          <p className="text-sm">No pudimos cargar tus condiciones.</p>
          <button
            type="button"
            onClick={() => void status.refetch()}
            className="btn-primary"
          >
            Reintentar
          </button>
        </div>
      ) : !status.data.healthDataConsent ? (
        // Criterio front 3: sin consentimiento el formulario no se habilita.
        <div className="surface-muted mt-4 flex flex-col items-start gap-3 text-sm text-[#5a3d0c]">
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
            className="btn-primary"
          >
            {consentir.isPending ? 'Guardando…' : 'Dar mi consentimiento'}
          </button>
          {consentir.isError ? (
            <p role="alert" className="field-error">
              No se pudo registrar. Probá de nuevo.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          {conditions.isPending ? (
            <p role="status" className="text-sm text-[#68675f]">
              Cargando condiciones…
            </p>
          ) : conditions.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-sm">No pudimos cargar tus condiciones.</p>
              <button
                type="button"
                onClick={() => void conditions.refetch()}
                className="btn-primary"
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
                  <p className="surface-muted py-10 text-center text-sm text-[#68675f]">
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
                    className="btn-secondary btn-sm"
                  >
                    {ninguna.isPending
                      ? 'Guardando…'
                      : 'No tengo ninguna condición física'}
                  </button>
                  {ninguna.isError ? (
                    <p role="alert" className="field-error">
                      {ninguna.error instanceof ApiError
                        ? (apiMessage(ninguna.error) ?? 'No se pudo guardar.')
                        : 'No se pudo guardar.'}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="border-t border-[#292823]/8 pt-5">
                <h3 className="eyebrow mb-3 text-[#68675f]">
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
