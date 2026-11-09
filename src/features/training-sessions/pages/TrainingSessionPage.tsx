import { useMutationState } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ApiError, validationMessages } from '../../../api/client';
import {
  updateSeriesRecord,
  type SeriePrecargada,
  type TrainingSession,
  type UpdateSeriesInput,
} from '../../../api/trainingSessions';
import { Banner } from '../../../shared/components/Banner';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { PreloadedSetFields } from '../components/PreloadedSetFields';
import { SubstituteExercisePanel } from '../components/SubstituteExercisePanel';
import { useSetPreload } from '../hooks/useSetPreload';
import {
  useAbandonTrainingSession,
  useActiveTrainingSession,
  useFinishTrainingSession,
  useStartTrainingSession,
  seriesMutationKey,
  useUpdateSeriesRecord,
} from '../hooks/useTrainingSession';
import {
  clearSessionDraft,
  mergeDraftIntoSession,
  readSessionDraft,
  writeSessionDraft,
} from '../lib/sessionDraft';
import { usePendingSeriesSync } from '../hooks/usePendingSeriesSync';
import { formatElapsed } from '../lib/sessionElapsed';
import {
  hasSeriesFieldErrors,
  validateSeriesFields,
  type SeriesFieldErrors,
} from '../lib/seriesValidation';
import { LoadingState } from '../../../shared/ui/LoadingState';

/** Reloj en vivo: emite la hora actual cada segundo mientras está activo. */
function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ticking]);
  return now;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'session_already_in_progress') {
      return 'Ya tenés una sesión en curso. Reanudala antes de iniciar otra.';
    }
    if (error.code === 'no_active_routine') {
      return 'Necesitás una rutina vigente para iniciar una sesión.';
    }
    if (error.code === 'atypical_series_requires_confirmation') {
      return 'La carga supera el 150% de tu mejor marca. Confirmala explícitamente.';
    }
    if (error.code === 'student_measurement_blocked') {
      return 'Tenés un bloqueo por mediciones pendiente.';
    }
    // El backend manda el detalle Zod (campo y rango esperado): mostrarlo
    // en vez del código seco `invalid_request_body`.
    if (
      error.code === 'invalid_request_body' ||
      error.code === 'invalid_request_parameters' ||
      error.code === 'series_out_of_range'
    ) {
      const details = validationMessages(error);
      if (details.length > 0) return details.join(' ');
      return 'Revisá los valores ingresados: carga entre 0 y 1000 kg, repeticiones entre 1 y 100 y esfuerzo entre 1 y 10.';
    }
    return `No pudimos completar la operación (${error.code}).`;
  }
  return 'Ocurrió un error inesperado.';
}

function SeriesRow({
  studentId,
  session,
  position,
  preload,
  current,
  onAtypical,
  onEnvioPendiente,
  onEnvioConfirmado,
}: {
  studentId: string;
  session: TrainingSession;
  position: number;
  /** Valores propuestos para esta serie (RF-030); `undefined` si no hay. */
  preload: SeriePrecargada | undefined;
  /** Primera serie sin completar: se resalta. */
  current: boolean;
  onAtypical: (body: unknown) => void;
  /** El envío se agotó sin llegar: queda en la cola de reintento (RNF-10). */
  onEnvioPendiente: (position: number, valores: UpdateSeriesInput) => void;
  onEnvioConfirmado: (position: number) => void;
}) {
  const record = session.setRecords.find((item) => item.position === position);
  const update = useUpdateSeriesRecord(studentId, session.id);
  // Lo escrito por el alumno (borrador) manda sobre la precarga.
  const [hasDraft] = useState(
    () => readSessionDraft(studentId, session.id)?.values[position] != null,
  );
  const preLoad = hasDraft ? '' : (preload?.carga?.toString() ?? '');
  const preReps = hasDraft ? '' : (preload?.repeticiones?.toString() ?? '');
  const baseLoad = record?.performedLoad?.toString() ?? preLoad;
  const baseReps = record?.performedRepetitions?.toString() ?? preReps;
  const [load, setLoad] = useState<string>(baseLoad);
  const [reps, setReps] = useState<string>(baseReps);
  const [effort, setEffort] = useState<string>(
    record?.perceivedEffort?.toString() ?? '',
  );
  const [localErrors, setLocalErrors] = useState<SeriesFieldErrors>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [omitting, setOmitting] = useState(false);
  const [omitReason, setOmitReason] = useState('');
  const [substituting, setSubstituting] = useState(false);
  const saveTimeout = useRef<number | null>(null);

  useEffect(() => {
    setLoad(baseLoad);
    setReps(baseReps);
    setEffort(record?.perceivedEffort?.toString() ?? '');
    // Sólo cuando cambia el registro del servidor; la precarga va aparte.
  }, [
    record?.performedLoad,
    record?.performedRepetitions,
    record?.perceivedEffort,
  ]);

  // La precarga llega async: sólo se aplica sobre campos aún vacíos.
  useEffect(() => {
    setLoad((actual) => (actual === '' ? baseLoad : actual));
    setReps((actual) => (actual === '' ? baseReps : actual));
  }, [baseLoad, baseReps]);

  const recordEffort = record?.perceivedEffort?.toString() ?? '';
  // La base incluye la precarga: precargar no es editar ni dispara guardado.
  const dirty =
    load !== baseLoad || reps !== baseReps || effort !== recordEffort;

  const saveNow = (atypicalConfirmed = false) => {
    if (!record) return;
    const fieldErrors = validateSeriesFields({ load, reps, effort });
    setLocalErrors(fieldErrors);
    if (hasSeriesFieldErrors(fieldErrors)) return;
    setNeedsConfirm(false);
    const valores: UpdateSeriesInput = {
      performedLoad: load === '' ? null : Number(load),
      performedRepetitions: reps === '' ? null : Number(reps),
      perceivedEffort: effort === '' ? null : Number(effort),
      completed: true,
      // Editar una serie omitida la reactiva: el backend rechaza completed + motivo (400).
      omissionReason: record.omissionReason ? null : undefined,
      atypicalConfirmed: atypicalConfirmed || undefined,
    };

    update.mutate(
      { position, ...valores },
      {
        onSuccess: (next) => {
          setSavedAt(new Date().toISOString());
          onEnvioConfirmado(position);
          // Limpia sólo esta posición: otras series pueden tener borrador.
          const draft = readSessionDraft(studentId, next.id);
          const values = { ...(draft?.values ?? {}) };
          delete values[position];
          writeSessionDraft({
            sessionId: next.id,
            studentId: next.studentId,
            updatedAt: new Date().toISOString(),
            paused: false,
            values,
          });
        },
        onError: (error) => {
          if (
            error instanceof ApiError &&
            error.code === 'atypical_series_requires_confirmation'
          ) {
            // Pausa el autoguardado hasta confirmar o corregir (RN-55a).
            setNeedsConfirm(true);
            onAtypical(error.body);
            return;
          }

          // El autoguardado ya agotó sus reintentos. Si fue por la red, la
          // serie pasa a la cola: se reenvía al recuperar la conexión en lugar
          // de quedar sólo en el borrador sin que nadie la vuelva a mandar
          // (RNF-10, CB-24).
          const esDeCliente =
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500;
          if (!esDeCliente) {
            onEnvioPendiente(position, valores);
          }
        },
      },
    );
  };

  // Autoguardado: 700 ms después de dejar de escribir. Sin botón.
  // Depende solo de los valores: el tick del reloj no reinicia el conteo.
  useEffect(() => {
    if (!dirty || needsConfirm) return;
    setSavedAt(null);
    saveTimeout.current = window.setTimeout(() => {
      saveTimeout.current = null;
      saveNow(false);
    }, 700);
    return () => {
      if (saveTimeout.current !== null) {
        window.clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
      }
    };
  }, [load, reps, effort, dirty, needsConfirm]);

  /** Al salir del campo se guarda de inmediato, sin esperar el debounce. */
  const flush = () => {
    if (saveTimeout.current === null || needsConfirm) return;
    window.clearTimeout(saveTimeout.current);
    saveTimeout.current = null;
    saveNow(false);
  };

  const handleChange =
    (field: keyof SeriesFieldErrors) =>
    (value: string): void => {
      const next = {
        load: field === 'load' ? value : load,
        reps: field === 'reps' ? value : reps,
        effort: field === 'effort' ? value : effort,
      };
      if (field === 'load') setLoad(value);
      if (field === 'reps') setReps(value);
      if (field === 'effort') setEffort(value);
      setLocalErrors((previous) => ({ ...previous, [field]: undefined }));
      // Si corrige el valor, el autoguardado retoma solo.
      setNeedsConfirm(false);
      // RNF-10: lo tipeado pero aún no enviado sobrevive a una recarga.
      const toNullableNumber = (text: string) =>
        text === '' || Number.isNaN(Number(text)) ? null : Number(text);
      const draft = readSessionDraft(studentId, session.id);
      writeSessionDraft({
        sessionId: session.id,
        studentId,
        updatedAt: new Date().toISOString(),
        paused: draft?.paused ?? false,
        values: {
          ...(draft?.values ?? {}),
          [position]: {
            performedLoad: toNullableNumber(next.load),
            performedRepetitions: toNullableNumber(next.reps),
            perceivedEffort: toNullableNumber(next.effort),
            completed: true,
          },
        },
      });
    };

  /** Botón "Completar serie": guarda ya, sin esperar el debounce. */
  const completar = () => {
    if (saveTimeout.current !== null) {
      window.clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    saveNow(false);
  };

  const omitir = () => {
    update.mutate(
      // El backend exige motivo no vacío: sin motivo se registra "Omitida".
      {
        position,
        completed: false,
        omissionReason: omitReason.trim() || 'Omitida',
      },
      {
        onSuccess: () => {
          setOmitting(false);
        },
      },
    );
  };

  const sustituir = (exerciseId: string) => {
    update.mutate(
      { position, performedExerciseId: exerciseId },
      {
        onSuccess: () => {
          setSubstituting(false);
        },
      },
    );
  };

  if (!record) return null;

  return (
    <li
      aria-current={current ? 'step' : undefined}
      className={`row-interactive rounded-2xl border bg-white/70 p-4 ${
        current ? 'border-2 border-graphite' : 'border-[#292823]/8'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">
          Serie {record.position} ·{' '}
          {record.prescribedExerciseName ?? record.performedExerciseName}
        </h3>
        {current ? <span className="chip-neutral">Serie actual</span> : null}
        {record.warmup ? (
          <span className="chip-neutral">Entrada en calor</span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-[#68675f]">
        {record.prescribedMinRepetitions === null ||
        record.prescribedMaxRepetitions === null
          ? 'Serie agregada, sin prescripción'
          : `Prescripto: ${record.prescribedMinRepetitions}–${record.prescribedMaxRepetitions} reps${
              record.prescribedLoad !== null
                ? ` · ${record.prescribedLoad} kg`
                : ''
            }`}
      </p>
      {record.performedExerciseName &&
      record.performedExerciseId !== record.prescribedExerciseId ? (
        <p className="mt-1 text-xs font-semibold">
          Ejecutado: {record.performedExerciseName}
        </p>
      ) : null}
      {record.omissionReason ? (
        <p className="mt-1 text-xs font-semibold">
          Omitida: {record.omissionReason}
        </p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2.5">
        <PreloadedSetFields
          serie={
            preload ?? {
              position,
              warmup: record.warmup,
              origen: 'SIN_DATOS',
              antiguedadEnDias: null,
              repeticionesMinimas: record.prescribedMinRepetitions,
              repeticionesMaximas: record.prescribedMaxRepetitions,
            }
          }
          carga={load === '' ? null : Number(load)}
          repeticiones={reps === '' ? null : Number(reps)}
          onCargaChange={(value) => {
            handleChange('load')(value === null ? '' : String(value));
          }}
          onRepeticionesChange={(value) => {
            handleChange('reps')(value === null ? '' : String(value));
          }}
          onBlur={flush}
          errorCarga={localErrors.load}
          errorRepeticiones={localErrors.reps}
        />
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#68675f]">
          Esfuerzo (1–10)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            value={effort}
            onChange={(event) => {
              handleChange('effort')(event.target.value);
            }}
            onBlur={flush}
            aria-invalid={Boolean(localErrors.effort)}
            className="field min-h-11 px-3 py-2 tabular-nums"
            aria-label={`Esfuerzo percibido de la serie ${String(record.position)}`}
          />
          {localErrors.effort ? (
            <span role="alert" className="field-error">
              {localErrors.effort}
            </span>
          ) : null}
        </label>
      </div>
      {update.isError && !update.isPending ? (
        <p role="alert" className="field-error mt-2">
          {errorMessage(update.error)}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2 empty:hidden">
        {update.isPending ? (
          <p role="status" className="text-xs text-[#77756d]">
            {update.isPaused ? 'Pendiente de sincronizar' : 'Guardando…'}
          </p>
        ) : savedAt && !dirty ? (
          <p role="status" className="text-xs font-semibold text-[#3b4d14]">
            Guardado ✓
          </p>
        ) : null}
        {!record.completed && !record.omissionReason ? (
          <>
            <button
              type="button"
              onClick={completar}
              disabled={update.isPending}
              className="btn-primary min-h-11"
            >
              Completar serie
            </button>
            <button
              type="button"
              onClick={() => {
                setOmitting((value) => !value);
                setSubstituting(false);
              }}
              disabled={update.isPending}
              className="btn-ghost min-h-11"
            >
              Omitir
            </button>
          </>
        ) : null}
        {!record.omissionReason ? (
          <button
            type="button"
            onClick={() => {
              setSubstituting((value) => !value);
              setOmitting(false);
            }}
            disabled={update.isPending}
            className="btn-ghost min-h-11"
          >
            Sustituir ejercicio
          </button>
        ) : null}
        {(needsConfirm ||
          (update.isError &&
            update.error instanceof ApiError &&
            update.error.code === 'atypical_series_requires_confirmation')) &&
        !update.isPending ? (
          <button
            type="button"
            onClick={() => saveNow(true)}
            className="btn-secondary btn-sm"
          >
            Confirmar valor atípico
          </button>
        ) : null}
      </div>
      {omitting ? (
        <div className="surface-muted mt-3 flex flex-col gap-2">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#68675f]">
            Motivo (opcional)
            <input
              type="text"
              maxLength={500}
              value={omitReason}
              onChange={(event) => {
                setOmitReason(event.target.value);
              }}
              aria-label={`Motivo de omisión de la serie ${String(position)}`}
              className="field min-h-11 px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={omitir}
            disabled={update.isPending}
            className="btn-secondary min-h-11"
          >
            Confirmar omisión
          </button>
        </div>
      ) : null}
      {substituting ? (
        <SubstituteExercisePanel
          position={position}
          disabled={update.isPending}
          prescribedExerciseId={record.prescribedExerciseId ?? undefined}
          onPick={sustituir}
          onCancel={() => {
            setSubstituting(false);
          }}
        />
      ) : null}
    </li>
  );
}

export interface TrainingSessionPageProps {
  studentId: string;
}

/**
 * Ejecución de la sesión (RF-027, FL-05, FL-07).
 * Pausar es local: detiene el cronómetro y conserva el borrador sin
 * transicionar en el backend (D6/§4, CB-25).
 */
export function TrainingSessionPage({ studentId }: TrainingSessionPageProps) {
  const active = useActiveTrainingSession();
  const start = useStartTrainingSession();
  const [paused, setPaused] = useState(false);
  const [pausedMs, setPausedMs] = useState(0);
  const [pauseStartedAt, setPauseStartedAt] = useState<number | null>(null);
  const [atypicalBody, setAtypicalBody] = useState<unknown>(null);
  const [closedMessage, setClosedMessage] = useState<string | null>(null);

  // Al cerrar la sesión el refetch de /active responde 404 y TanStack Query
  // conserva el último dato: sin esta guarda la pantalla seguiría mostrando la
  // sesión ya cerrada con Finalizar / Descartar, que devuelven 409.
  const sinSesionActiva =
    active.isError &&
    active.error instanceof ApiError &&
    active.error.status === 404;

  const session = useMemo(() => {
    if (!active.data || sinSesionActiva) return null;
    const draft = readSessionDraft(studentId, active.data.id);
    return mergeDraftIntoSession(active.data, draft);
  }, [active.data, sinSesionActiva, studentId]);

  useEffect(() => {
    if (!active.data) return;
    const draft = readSessionDraft(studentId, active.data.id);
    setPaused(draft?.paused ?? false);
    // Al recargar con pausa guardada, el contador queda congelado en el
    // instante del borrador: el tiempo en pausa no suma (CB-25).
    setPauseStartedAt(
      draft?.paused ? new Date(draft.updatedAt).getTime() : null,
    );
    setPausedMs(0);
  }, [active.data, studentId]);

  // Tiempo real: late cada segundo salvo en pausa, donde se congela.
  const now = useNow(!!session && !paused);
  const preload = useSetPreload(studentId, session?.routineDayId ?? '');
  const add = useUpdateSeriesRecord(studentId, session?.id ?? 'sin-sesion');
  const [addWarmup, setAddWarmup] = useState(false);
  const [choosingAdd, setChoosingAdd] = useState(false);

  // Cola de series que el autoguardado no logró enviar (RNF-10, CB-24).
  // Offline TanStack pausa la mutación sin llegar a onError: se cuenta aparte.
  const pausadas = useMutationState({
    filters: { mutationKey: seriesMutationKey, status: 'pending' },
    select: (m) => m.state.isPaused,
  }).filter(Boolean).length;
  const pendientes = usePendingSeriesSync({
    enviarSerie: (position, valores) =>
      updateSeriesRecord(
        studentId,
        session?.id ?? 'sin-sesion',
        position,
        valores,
      ).then(() => undefined),
    onSesionCerrada: () => {
      // Criterio 8: la sesión dejó de admitir registros mientras el teléfono
      // estaba sin señal. Se avisa en lugar de descartar en silencio.
      setClosedMessage(
        'Esta sesión ya no admite registros: se cerró mientras estabas sin conexión. Lo anterior quedó guardado.',
      );
    },
  });

  const finish = useFinishTrainingSession(
    studentId,
    session?.id ?? 'sin-sesion',
  );
  const abandon = useAbandonTrainingSession(
    studentId,
    session?.id ?? 'sin-sesion',
  );

  const togglePause = () => {
    if (!session) return;
    if (paused) {
      // Reanudar: el tramo en pausa no suma al cronómetro.
      if (pauseStartedAt !== null) {
        setPausedMs((total) => total + (Date.now() - pauseStartedAt));
      }
      setPauseStartedAt(null);
      setPaused(false);
    } else {
      setPauseStartedAt(Date.now());
      setPaused(true);
    }
    const draft = readSessionDraft(studentId, session.id);
    writeSessionDraft({
      sessionId: session.id,
      studentId,
      updatedAt: new Date().toISOString(),
      paused: !paused,
      values: draft?.values ?? {},
    });
  };

  const elapsed = session
    ? formatElapsed(
        session.startedAt,
        paused ? (pauseStartedAt ?? now) : now,
        paused,
        pausedMs,
      )
    : '';

  if (active.isPending) {
    return (
      <div>
        <PageHeader
          kicker="Sesión en curso"
          title="Tu entrenamiento"
          description="Registro de series, cargas y repeticiones de la sesión activa."
        />
        <main className="page-body flex flex-col gap-6">
          <LoadingState label="Buscando tu sesión en curso…" variant="card" />
        </main>
      </div>
    );
  }

  if (active.isError) {
    const notFound =
      active.error instanceof ApiError && active.error.status === 404;
    if (!notFound) {
      return (
        <div>
          <PageHeader
            kicker="Sesión en curso"
            title="Tu entrenamiento"
            description="Registro de series, cargas y repeticiones de la sesión activa."
          />
          <main className="page-body flex flex-col gap-6">
            <Banner
              variant="danger"
              title="No pudimos consultar tu sesión"
              actions={
                <button
                  type="button"
                  onClick={() => void active.refetch()}
                  disabled={active.isFetching}
                  className="btn-primary btn-sm"
                >
                  Reintentar
                </button>
              }
            >
              <p>{errorMessage(active.error)}</p>
            </Banner>
          </main>
        </div>
      );
    }
  }

  if (!session) {
    return (
      <div>
        <PageHeader
          kicker="Sesión en curso"
          title="Tu entrenamiento"
          description="Iniciá, pausá, reanudá y cerrá tu sesión sin perder el hilo."
        />
        <main className="page-body flex flex-col gap-6">
          {closedMessage ? (
            <Banner variant="info" title="Sesión cerrada">
              <p>{closedMessage}</p>
            </Banner>
          ) : null}
          <BentoCard>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Sin sesión en curso
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#68675f]">
              Iniciá sobre el siguiente día de tu rutina vigente. Si te
              interrumpen, la sesión queda en curso y la retomás acá mismo.
              Pasadas 8 h sin actividad se cierra sola como abandonada.
            </p>
            {start.isError ? (
              <p role="alert" className="field-error mt-3">
                {errorMessage(start.error)}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() =>
                start.mutate(
                  { studentId },
                  {
                    onSuccess: (next) => {
                      setClosedMessage(null);
                      setPaused(false);
                      setPausedMs(0);
                      setPauseStartedAt(null);
                      clearSessionDraft(studentId, next.id);
                    },
                  },
                )
              }
              disabled={start.isPending}
              className="btn-primary mt-4"
            >
              {start.isPending ? 'Iniciando…' : 'Iniciar sesión'}
            </button>
          </BentoCard>
        </main>
      </div>
    );
  }

  const currentPosition = session.setRecords.find(
    (r) => !r.completed && !r.omissionReason,
  )?.position;
  const nextPosition =
    Math.max(0, ...session.setRecords.map((r) => r.position)) + 1;
  // La serie agregada propone el ejercicio de la última serie.
  const lastRecord = session.setRecords[session.setRecords.length - 1];
  const lastExerciseId =
    lastRecord?.performedExerciseId ?? lastRecord?.prescribedExerciseId;

  return (
    <div>
      <PageHeader
        kicker="Sesión en curso"
        title={
          session.routineDayName === null
            ? 'Sesión sin detalle de rutina'
            : `${session.routineDayName} · Día ${session.routineDayPosition}`
        }
        description="Registro de series, cargas y repeticiones de la sesión activa."
      />
      <main className="page-body flex flex-col gap-6">
        {closedMessage ? (
          <Banner variant="info" title="Sesión cerrada">
            <p>{closedMessage}</p>
          </Banner>
        ) : null}
        {pendientes.pendientes.length + pausadas > 0 ? (
          <Banner variant="warning" title="Pendiente de sincronizar">
            {/* El mensaje habla del trabajo a salvo, no de la red: mientras el
                borrador local funcione, perder conexión no le cuesta nada al
                alumno y no hay motivo para alarmarlo (RNF-10). */}
            <p>
              {pendientes.pendientes.length + pausadas === 1
                ? 'Guardamos 1 serie en este dispositivo. Se envía sola al recuperar la conexión.'
                : `Guardamos ${String(pendientes.pendientes.length + pausadas)} series en este dispositivo. Se envían solas al recuperar la conexión.`}
            </p>
            {pendientes.pendientes.length > 0 ? (
              <button
                type="button"
                onClick={pendientes.sincronizar}
                disabled={pendientes.sincronizando}
                className="btn-ghost mt-2"
              >
                {pendientes.sincronizando ? 'Enviando…' : 'Reintentar ahora'}
              </button>
            ) : null}
          </Banner>
        ) : null}
        {session.aptitudeWarning ? (
          <Banner
            variant="info"
            title={
              session.aptitudeWarning === 'AUSENTE'
                ? 'No registramos tu aptitud'
                : 'Tu aptitud está vencida'
            }
          >
            <p>
              Podés entrenar igual: es sólo un aviso destacado y no bloquea la
              sesión.
            </p>
          </Banner>
        ) : null}
        {session.compatibilityWarnings.length > 0 ? (
          <Banner
            variant="info"
            title="Revisá estos ejercicios con tu entrenador"
          >
            <p>
              {session.compatibilityWarnings.length} ejercicio(s) con marca de
              compatibilidad en este día.
            </p>
          </Banner>
        ) : null}
        {atypicalBody ? (
          <Banner variant="info" title="Serie atípica">
            <p>
              Confirmá explícitamente para registrarla; puede producir un
              récord.
            </p>
          </Banner>
        ) : null}

        <BentoCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow text-[#77756d]">
                {paused ? 'En pausa' : 'Tiempo transcurrido'}
              </p>
              <p
                role="timer"
                aria-live="off"
                aria-label="Tiempo transcurrido de la sesión"
                className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink tabular-nums"
              >
                ⏱ {elapsed}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePause}
                aria-pressed={paused}
                className="btn-secondary"
              >
                {paused ? 'Reanudar' : 'Pausar'}
              </button>
              <button
                type="button"
                onClick={() =>
                  finish.mutate(undefined, {
                    onSuccess: (next) => {
                      clearSessionDraft(studentId, next.id);
                      setClosedMessage(
                        'Sesión completada. Ya suma para tus indicadores.',
                      );
                    },
                  })
                }
                disabled={finish.isPending}
                className="btn-primary"
              >
                {finish.isPending ? 'Cerrando…' : 'Finalizar'}
              </button>
              <button
                type="button"
                onClick={() =>
                  abandon.mutate(undefined, {
                    onSuccess: (next) => {
                      clearSessionDraft(studentId, next.id);
                      setClosedMessage(
                        'Sesión abandonada. Conservamos lo registrado.',
                      );
                    },
                  })
                }
                disabled={abandon.isPending}
                className="btn-ghost"
              >
                Descartar
              </button>
            </div>
          </div>
          {(finish.isError || abandon.isError) && (
            <p role="alert" className="field-error mt-3">
              {errorMessage(finish.error ?? abandon.error)}
            </p>
          )}
        </BentoCard>

        <BentoCard>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Series ({session.setRecords.length})
          </h2>
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {session.setRecords.map((record) => (
              <SeriesRow
                key={record.position}
                studentId={studentId}
                session={session}
                position={record.position}
                preload={preload.data?.series.find(
                  (serie) => serie.position === record.position,
                )}
                current={record.position === currentPosition}
                onAtypical={setAtypicalBody}
                onEnvioPendiente={pendientes.encolar}
                onEnvioConfirmado={pendientes.confirmar}
              />
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={addWarmup}
                onChange={(event) => {
                  setAddWarmup(event.target.checked);
                }}
                className="size-5"
              />
              Entrada en calor
            </label>
            <button
              type="button"
              disabled={add.isPending || !lastExerciseId}
              onClick={() => {
                setChoosingAdd((value) => !value);
              }}
              className="btn-secondary min-h-11"
            >
              Agregar serie
            </button>
          </div>
          {choosingAdd && lastExerciseId ? (
            <SubstituteExercisePanel
              position={nextPosition}
              disabled={add.isPending}
              defaultExerciseId={lastExerciseId}
              onPick={(exerciseId) => {
                add.mutate(
                  {
                    position: nextPosition,
                    additional: true,
                    performedExerciseId: exerciseId,
                    performedWarmup: addWarmup,
                  },
                  {
                    onSuccess: () => {
                      setChoosingAdd(false);
                    },
                  },
                );
              }}
              onCancel={() => {
                setChoosingAdd(false);
              }}
            />
          ) : null}
          {add.isError && !add.isPending ? (
            <p role="alert" className="field-error mt-2">
              {errorMessage(add.error)}
            </p>
          ) : null}
        </BentoCard>
      </main>
    </div>
  );
}
