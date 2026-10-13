import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import type { RoutineGenerationStatus } from '../../../api/routineGenerations';
import { Banner } from '../../../shared/components/Banner';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { requestErrorMessage } from '../lib/generationErrors';
import { useRequestRoutineGeneration } from '../hooks/useRequestRoutineGeneration';
import { useFinalizeRoutineGeneration } from '../hooks/useFinalizeRoutineGeneration';
import { useRoutineGeneration } from '../hooks/useRoutineGeneration';
import {
  clearGenerationTracking,
  fingerprintGenerationInput,
  loadGenerationTracking,
  saveGenerationTracking,
  type GenerationTracking,
} from '../lib/generationTracking';

export interface RoutineGenerationPanelProps {
  studentId: string;
  /**
   * Destino del enlace "Ver rutina". El alumno va a `/alumno/rutina`; el
   * entrenador, a la ficha del alumno que está mirando.
   */
  revisionHref?: string;
  /**
   * Si se informa, el panel habla del alumno en tercera persona (vista del
   * entrenador con asignación vigente) en lugar de en segunda.
   */
  nombreAlumno?: string;
}

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

function isPendingRoutineConflict(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.code === 'proposed_routine_already_exists'
  );
}

function statusLabel(status: RoutineGenerationStatus): string {
  switch (status) {
    case 'PENDIENTE':
      return 'Solicitud recibida';
    case 'PROCESANDO':
      return 'Generando rutina';
    case 'COMPLETADA':
      return 'Generación completada';
    case 'NO_DISPONIBLE':
      return 'Generación no disponible';
    case 'CANCELADA':
      return 'Generación cancelada';
  }
}

export function RoutineGenerationPanel({
  studentId,
  revisionHref = '/alumno/rutina',
  nombreAlumno,
}: RoutineGenerationPanelProps) {
  const esEntrenador = nombreAlumno !== undefined;
  const [instructions, setInstructions] = useState('');
  const [tracking, setTracking] = useState<GenerationTracking | null>(() =>
    loadGenerationTracking(studentId),
  );
  const request = useRequestRoutineGeneration(studentId);
  const generation = useRoutineGeneration(studentId, tracking?.requestId);
  const finalize = useFinalizeRoutineGeneration(studentId, tracking?.requestId);
  const snapshot = generation.data;

  useEffect(() => {
    if (
      snapshot?.status === 'COMPLETADA' &&
      !snapshot.routineId &&
      !finalize.isPending &&
      !finalize.isSuccess &&
      !finalize.isError
    ) {
      finalize.mutate();
    }
  }, [finalize, snapshot]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const textoLibre = instructions.trim();
    if (!textoLibre) return;

    const inputFingerprint = await fingerprintGenerationInput(textoLibre);
    const nextTracking =
      tracking?.inputFingerprint === inputFingerprint
        ? tracking
        : tracking && !tracking.inputFingerprint
          ? { ...tracking, inputFingerprint }
          : {
              idempotencyKey: createIdempotencyKey(),
              inputFingerprint,
              regenerate: tracking?.regenerate,
            };
    saveGenerationTracking(studentId, nextTracking);
    setTracking(nextTracking);

    const submitWithTracking = async (requestTracking: GenerationTracking) => {
      const accepted = await request.mutateAsync({
        textoLibre,
        idempotencyKey: requestTracking.idempotencyKey,
        ...(requestTracking.regenerate ? { regenerar: true } : {}),
      });
      const acceptedTracking = {
        ...requestTracking,
        requestId: accepted.requestId,
      };
      saveGenerationTracking(studentId, acceptedTracking);
      setTracking(acceptedTracking);
    };

    try {
      await submitWithTracking(nextTracking);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === 'routine_generation_idempotency_conflict'
      ) {
        const retryTracking = {
          idempotencyKey: createIdempotencyKey(),
          inputFingerprint,
          regenerate: nextTracking.regenerate,
        };
        saveGenerationTracking(studentId, retryTracking);
        setTracking(retryTracking);

        // A 409 confirms this key and input were not accepted as a request.
        // Retry once with a fresh key to recover stale or cross-tab state.
        if (instructions.trim() === textoLibre) {
          try {
            await submitWithTracking(retryTracking);
          } catch {
            // Keep the new key so another attempt with the same input is safe.
          }
        }
      }
      // La clave se conserva para que un reintento sea idempotente incluso si
      // la respuesta se perdió después de que backend aceptara la solicitud.
    }
  };

  const startAnother = () => {
    clearGenerationTracking(studentId);
    setTracking(null);
    setInstructions('');
    request.reset();
    finalize.reset();
  };

  const retryWithNewIdempotencyKey = async () => {
    const textoLibre = instructions.trim();
    if (!textoLibre) return;
    const inputFingerprint = await fingerprintGenerationInput(textoLibre);
    const nextTracking = {
      idempotencyKey: createIdempotencyKey(),
      inputFingerprint,
      regenerate: tracking?.regenerate,
    };
    saveGenerationTracking(studentId, nextTracking);
    setTracking(nextTracking);
    request.reset();
  };

  const isActive =
    snapshot?.status === 'PENDIENTE' || snapshot?.status === 'PROCESANDO';
  const pendingRoutineConflict = isPendingRoutineConflict(finalize.error);
  const editingRegeneration = tracking?.regenerate && !tracking.requestId;
  const canRegenerate =
    import.meta.env.DEV &&
    !request.isPending &&
    !finalize.isPending &&
    !editingRegeneration &&
    (!tracking?.requestId || (snapshot && !isActive));

  const prepareRegeneration = () => {
    const nextTracking = {
      idempotencyKey: createIdempotencyKey(),
      regenerate: true,
    };
    saveGenerationTracking(studentId, nextTracking);
    setTracking(nextTracking);
    request.reset();
    finalize.reset();
  };

  return (
    <BentoCard className="mt-4">
      <p className="eyebrow text-[#77756d]">Generación asistida</p>
      <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.06em]">
        {editingRegeneration
          ? 'Regenerar rutina'
          : esEntrenador
            ? 'Nueva rutina'
            : 'Pedí tu rutina como quieras'}
      </h2>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-[#77756d]">
        {esEntrenador ? (
          <>
            Agregá indicaciones para complementar el perfil de {nombreAlumno} y
            su historial. La IA elegirá entre los ejercicios habilitados del
            gimnasio y la propuesta quedará pendiente de tu revisión antes de
            regir.
          </>
        ) : (
          <>
            Contá con tus palabras qué rutina querés: objetivo, días por semana,
            duración, músculos a priorizar o ejercicios que preferís evitar. La
            IA elegirá entre los ejercicios habilitados del gimnasio y el
            entrenador revisará la propuesta antes de ponerla en vigencia.
          </>
        )}
      </p>

      {!tracking?.requestId ? (
        <form
          onSubmit={(event) => void submit(event)}
          aria-label="Generar rutina"
          className="mt-5 flex max-w-2xl flex-col gap-3"
        >
          {editingRegeneration ? (
            <Banner variant="warning" title="Prueba de regeneración">
              <p>
                Escribí otro prompt. La propuesta pendiente se reemplazará sólo
                cuando la nueva generación termine y supere las validaciones.
              </p>
            </Banner>
          ) : null}
          <label
            htmlFor="generation-instructions"
            className="eyebrow text-[#77756d]"
          >
            Indicaciones
          </label>
          <textarea
            id="generation-instructions"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={4}
            required
            placeholder="Por ejemplo: priorizar fuerza y sesiones de hasta 60 minutos."
            className="rounded-xl border border-[#292823]/15 bg-white px-3.5 py-3 text-sm font-medium text-ink outline-none transition focus:border-graphite"
          />
          {request.error ? (
            <p role="alert" className="text-coral-strong text-xs font-medium">
              {requestErrorMessage(request.error, esEntrenador)}
            </p>
          ) : null}
          {isPendingRoutineConflict(request.error) ? (
            <Link
              to={revisionHref}
              className="w-fit rounded-full bg-graphite px-4 py-2 text-xs font-bold text-white"
            >
              Ver rutina pendiente de revisión
            </Link>
          ) : null}
          {request.error instanceof ApiError &&
          request.error.code === 'routine_generation_idempotency_conflict' ? (
            <button
              type="button"
              onClick={() => void retryWithNewIdempotencyKey()}
              className="w-fit rounded-full border border-black/10 px-4 py-2 text-xs font-bold"
            >
              Reintentar con una clave nueva
            </button>
          ) : null}
          <button
            type="submit"
            disabled={request.isPending || instructions.trim().length === 0}
            className="w-fit rounded-full bg-graphite px-4 py-2.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {request.isPending
              ? 'Enviando…'
              : editingRegeneration
                ? 'Generar de nuevo'
                : 'Generar nueva rutina'}
          </button>
        </form>
      ) : (
        <div className="mt-5 max-w-2xl">
          {generation.isPending ? (
            <p role="status" className="text-xs font-semibold text-[#77756d]">
              Recuperando el estado de la generación…
            </p>
          ) : null}

          {generation.error ? (
            <Banner
              variant="danger"
              title="No pudimos consultar la generación"
              actions={
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void generation.refetch()}
                    disabled={generation.isFetching}
                    className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                  >
                    Reintentar
                  </button>
                  <button
                    type="button"
                    onClick={startAnother}
                    className="rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-bold"
                  >
                    Descartar seguimiento
                  </button>
                </div>
              }
            />
          ) : null}

          {snapshot ? (
            <Banner
              variant={
                pendingRoutineConflict
                  ? 'warning'
                  : snapshot.status === 'NO_DISPONIBLE' ||
                      snapshot.status === 'CANCELADA' ||
                      finalize.isError
                    ? 'danger'
                    : 'info'
              }
              title={
                pendingRoutineConflict
                  ? 'Rutina pendiente de revisión'
                  : statusLabel(snapshot.status)
              }
              actions={
                pendingRoutineConflict ? (
                  <Link
                    to={revisionHref}
                    className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white"
                  >
                    Ver rutina pendiente de revisión
                  </Link>
                ) : snapshot.routineId || finalize.isSuccess ? (
                  <Link
                    to={revisionHref}
                    className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white"
                  >
                    Ver rutina
                  </Link>
                ) : !isActive && !finalize.isPending ? (
                  <button
                    type="button"
                    onClick={startAnother}
                    className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white"
                  >
                    Nueva solicitud
                  </button>
                ) : undefined
              }
            >
              <p>
                {snapshot.status === 'PENDIENTE'
                  ? 'La solicitud está en espera. Podés salir de esta pantalla y retomarla después.'
                  : snapshot.status === 'PROCESANDO'
                    ? 'El servicio está preparando la estructura. Esta pantalla se actualiza automáticamente.'
                    : snapshot.status === 'COMPLETADA' && finalize.isPending
                      ? 'El backend está validando el resultado y creando la rutina propuesta.'
                      : snapshot.status === 'COMPLETADA' &&
                          (snapshot.routineId || finalize.isSuccess)
                        ? 'La rutina propuesta quedó creada y está lista para revisión.'
                        : snapshot.status === 'COMPLETADA' && finalize.error
                          ? requestErrorMessage(finalize.error, esEntrenador)
                          : snapshot.status === 'CANCELADA'
                            ? 'La solicitud fue cancelada y no produjo una rutina.'
                            : snapshot.error === 'context_capacity_exceeded'
                              ? 'El contexto completo supera la capacidad configurada del modelo. El administrador debe revisar la configuración del servicio.'
                              : (snapshot.reason ??
                                'No se pudo completar la generación. Intentá con una nueva solicitud.')}
              </p>
              {snapshot.violaciones?.length ? (
                <ul className="mt-2 list-disc pl-5">
                  {snapshot.violaciones.map((violation) => (
                    <li key={violation}>{violation}</li>
                  ))}
                </ul>
              ) : null}
            </Banner>
          ) : null}
        </div>
      )}
      {canRegenerate ? (
        <button
          type="button"
          onClick={prepareRegeneration}
          className="mt-4 w-fit rounded-full border border-black/15 px-4 py-2.5 text-xs font-bold"
        >
          Regenerar
        </button>
      ) : null}
    </BentoCard>
  );
}
