import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEventHandler } from 'react';

import { ApiError, validationMessages } from '../../../api/client';
import type { TrainingSession } from '../../../api/trainingSessions';
import { Banner } from '../../../shared/components/Banner';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import {
  useAbandonTrainingSession,
  useActiveTrainingSession,
  useFinishTrainingSession,
  useStartTrainingSession,
  useUpdateSeriesRecord,
} from '../hooks/useTrainingSession';
import {
  clearSessionDraft,
  mergeDraftIntoSession,
  readSessionDraft,
  writeSessionDraft,
} from '../lib/sessionDraft';
import { formatElapsed } from '../lib/sessionElapsed';
import {
  hasSeriesFieldErrors,
  validateSeriesFields,
  type SeriesFieldErrors,
} from '../lib/seriesValidation';

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
  onAtypical,
}: {
  studentId: string;
  session: TrainingSession;
  position: number;
  onAtypical: (body: unknown) => void;
}) {
  const record = session.setRecords.find((item) => item.position === position);
  const update = useUpdateSeriesRecord(studentId, session.id);
  const [load, setLoad] = useState<string>(
    record?.performedLoad?.toString() ?? '',
  );
  const [reps, setReps] = useState<string>(
    record?.performedRepetitions?.toString() ?? '',
  );
  const [effort, setEffort] = useState<string>(
    record?.perceivedEffort?.toString() ?? '',
  );
  const [localErrors, setLocalErrors] = useState<SeriesFieldErrors>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const saveTimeout = useRef<number | null>(null);

  useEffect(() => {
    setLoad(record?.performedLoad?.toString() ?? '');
    setReps(record?.performedRepetitions?.toString() ?? '');
    setEffort(record?.perceivedEffort?.toString() ?? '');
  }, [
    record?.performedLoad,
    record?.performedRepetitions,
    record?.perceivedEffort,
  ]);

  const recordLoad = record?.performedLoad?.toString() ?? '';
  const recordReps = record?.performedRepetitions?.toString() ?? '';
  const recordEffort = record?.perceivedEffort?.toString() ?? '';
  const dirty =
    load !== recordLoad || reps !== recordReps || effort !== recordEffort;

  const saveNow = (atypicalConfirmed = false) => {
    if (!record) return;
    const fieldErrors = validateSeriesFields({ load, reps, effort });
    setLocalErrors(fieldErrors);
    if (hasSeriesFieldErrors(fieldErrors)) return;
    setNeedsConfirm(false);
    update.mutate(
      {
        position,
        performedLoad: load === '' ? null : Number(load),
        performedRepetitions: reps === '' ? null : Number(reps),
        perceivedEffort: effort === '' ? null : Number(effort),
        completed: true,
        atypicalConfirmed: atypicalConfirmed || undefined,
      },
      {
        onSuccess: (next) => {
          setSavedAt(new Date().toISOString());
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
    (field: keyof SeriesFieldErrors): ChangeEventHandler<HTMLInputElement> =>
    (event) => {
      const value = event.target.value;
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

  if (!record) return null;

  return (
    <li className="row-interactive rounded-2xl border border-[#292823]/8 bg-white/70 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">
          Serie {record.position} · {record.prescribedExerciseName}
        </h3>
        {record.warmup ? (
          <span className="chip-neutral">Entrada en calor</span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-[#68675f]">
        Prescripto: {record.prescribedMinRepetitions}–
        {record.prescribedMaxRepetitions} reps
        {record.prescribedLoad !== null ? ` · ${record.prescribedLoad} kg` : ''}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#68675f]">
          Carga (kg)
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={1000}
            step={0.5}
            value={load}
            onChange={handleChange('load')}
            onBlur={flush}
            aria-invalid={Boolean(localErrors.load)}
            aria-describedby={
              localErrors.load
                ? `serie-${record.position}-load-error`
                : undefined
            }
            className="field mt-auto px-3 py-2 tabular-nums"
            aria-label={`Carga de la serie ${record.position}`}
          />
          {localErrors.load ? (
            <span
              id={`serie-${record.position}-load-error`}
              role="alert"
              className="field-error"
            >
              {localErrors.load}
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#68675f]">
          Reps
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={reps}
            onChange={handleChange('reps')}
            onBlur={flush}
            aria-invalid={Boolean(localErrors.reps)}
            aria-describedby={
              localErrors.reps
                ? `serie-${record.position}-reps-error`
                : undefined
            }
            className="field mt-auto px-3 py-2 tabular-nums"
            aria-label={`Repeticiones de la serie ${record.position}`}
          />
          {localErrors.reps ? (
            <span
              id={`serie-${record.position}-reps-error`}
              role="alert"
              className="field-error"
            >
              {localErrors.reps}
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#68675f]">
          Esfuerzo (1–10)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            value={effort}
            onChange={handleChange('effort')}
            onBlur={flush}
            aria-invalid={Boolean(localErrors.effort)}
            aria-describedby={
              localErrors.effort
                ? `serie-${record.position}-effort-error`
                : undefined
            }
            className="field mt-auto px-3 py-2 tabular-nums"
            aria-label={`Esfuerzo percibido de la serie ${record.position}`}
          />
          {localErrors.effort ? (
            <span
              id={`serie-${record.position}-effort-error`}
              role="alert"
              className="field-error"
            >
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
            Guardando…
          </p>
        ) : savedAt && !dirty ? (
          <p role="status" className="text-xs font-semibold text-[#3b4d14]">
            Guardado ✓
          </p>
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

  const session = useMemo(() => {
    if (!active.data) return null;
    const draft = readSessionDraft(studentId, active.data.id);
    return mergeDraftIntoSession(active.data, draft);
  }, [active.data, studentId]);

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
          <p role="status">Buscando tu sesión en curso…</p>
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

  return (
    <div>
      <PageHeader
        kicker="Sesión en curso"
        title={`${session.routineDayName} · Día ${session.routineDayPosition}`}
        description="Registro de series, cargas y repeticiones de la sesión activa."
      />
      <main className="page-body flex flex-col gap-6">
        {closedMessage ? (
          <Banner variant="info" title="Sesión cerrada">
            <p>{closedMessage}</p>
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
                onAtypical={setAtypicalBody}
              />
            ))}
          </ul>
        </BentoCard>
      </main>
    </div>
  );
}
