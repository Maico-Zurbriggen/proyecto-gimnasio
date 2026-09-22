import { useEffect, useState, type FormEvent } from 'react';

import { ApiError } from '../../../api/client';
import type { RoutineGenerationStatus } from '../../../api/routineGenerations';
import { Banner } from '../../../shared/components/Banner';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { useRequestRoutineGeneration } from '../hooks/useRequestRoutineGeneration';
import { useFinalizeRoutineGeneration } from '../hooks/useFinalizeRoutineGeneration';
import { useRoutineGeneration } from '../hooks/useRoutineGeneration';
import {
  clearGenerationTracking,
  loadGenerationTracking,
  saveGenerationTracking,
  type GenerationTracking,
} from '../lib/generationTracking';

export interface RoutineGenerationPanelProps {
  studentId: string;
}

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

function requestErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos solicitar la rutina. Probá de nuevo.';
  }

  switch (error.code) {
    case 'empty_prefiltered_catalog':
      return 'No hay ejercicios compatibles con el inventario del gimnasio.';
    case 'student_not_found':
      return 'Tu perfil de alumno ya no está disponible.';
    case 'forbidden_not_assigned':
    case 'forbidden_role':
      return 'No tenés permiso para generar esta rutina.';
    case 'ai_service_unavailable':
      return 'La generación está temporalmente no disponible. El resto de la ficha sigue funcionando.';
    case 'missing_generation_input':
      return 'Escribí al menos una indicación para la nueva rutina.';
    case 'proposed_routine_already_exists':
      return 'Ya tenés una rutina propuesta pendiente de revisión.';
    case 'invalid_generated_routine':
      return 'La salida no superó las validaciones de seguridad del backend.';
    case 'routine_generation_not_completed':
      return 'La generación todavía no terminó. Reintentá en unos segundos.';
    default:
      return 'No pudimos solicitar la rutina. Probá de nuevo.';
  }
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
}: RoutineGenerationPanelProps) {
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

    const nextTracking = tracking ?? {
      idempotencyKey: createIdempotencyKey(),
    };
    saveGenerationTracking(studentId, nextTracking);
    setTracking(nextTracking);

    try {
      const accepted = await request.mutateAsync({
        textoLibre,
        idempotencyKey: nextTracking.idempotencyKey,
      });
      const acceptedTracking = {
        ...nextTracking,
        requestId: accepted.requestId,
      };
      saveGenerationTracking(studentId, acceptedTracking);
      setTracking(acceptedTracking);
    } catch {
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

  const isActive =
    snapshot?.status === 'PENDIENTE' || snapshot?.status === 'PROCESANDO';

  return (
    <BentoCard className="mt-4">
      <p className="eyebrow text-[#77756d]">Generación asistida</p>
      <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.06em]">
        Nueva rutina
      </h2>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-[#77756d]">
        Agregá indicaciones para complementar tu perfil, tus condiciones y el
        equipamiento que el backend valida antes de crear la propuesta.
      </p>

      {!tracking?.requestId ? (
        <form
          onSubmit={(event) => void submit(event)}
          aria-label="Generar rutina"
          className="mt-5 flex max-w-2xl flex-col gap-3"
        >
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
              {requestErrorMessage(request.error)}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={request.isPending || instructions.trim().length === 0}
            className="w-fit rounded-full bg-graphite px-4 py-2.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {request.isPending ? 'Enviando…' : 'Generar nueva rutina'}
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
                snapshot.status === 'NO_DISPONIBLE' ||
                snapshot.status === 'CANCELADA' ||
                finalize.isError
                  ? 'danger'
                  : 'info'
              }
              title={statusLabel(snapshot.status)}
              actions={
                !isActive && !snapshot.routineId ? (
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
                          ? requestErrorMessage(finalize.error)
                          : snapshot.status === 'CANCELADA'
                            ? 'La solicitud fue cancelada y no produjo una rutina.'
                            : `No se pudo completar la generación${snapshot.error ? ` (${snapshot.error})` : ''}.`}
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
    </BentoCard>
  );
}
