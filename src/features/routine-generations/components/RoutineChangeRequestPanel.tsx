import { useEffect, useState, type FormEvent } from 'react';

import { Banner } from '../../../shared/components/Banner';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { useInvalidateRoutines } from '../../prescriptions/hooks/usePrescriptions';
import { useFinalizeRoutineGeneration } from '../hooks/useFinalizeRoutineGeneration';
import { useRequestRoutineGeneration } from '../hooks/useRequestRoutineGeneration';
import { useRoutineGeneration } from '../hooks/useRoutineGeneration';
import { requestErrorMessage } from '../lib/generationErrors';

export interface RoutineChangeRequestPanelProps {
  /** Alumno dueño de la rutina propuesta. */
  studentId: string;
  /** Se invoca con la nueva rutina propuesta, que reemplaza a la anterior. */
  onApplied?: (routineId: string) => void;
  /** Habla del alumno en tercera persona (vista del entrenador). */
  esEntrenador?: boolean;
}

/**
 * Pedir cambios sobre la rutina propuesta (HITL básico): la persona escribe
 * qué quiere distinto, la IA genera otra propuesta a partir de la actual y ésta
 * la reemplaza. Sigue pendiente de revisión del entrenador.
 */
export function RoutineChangeRequestPanel({
  studentId,
  onApplied,
  esEntrenador = false,
}: RoutineChangeRequestPanelProps) {
  const [changes, setChanges] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const [requestId, setRequestId] = useState<string>();
  const request = useRequestRoutineGeneration(studentId);
  const generation = useRoutineGeneration(studentId, requestId);
  const finalize = useFinalizeRoutineGeneration(studentId, requestId);
  const invalidateRoutines = useInvalidateRoutines(studentId);
  const snapshot = generation.data;
  const isActive =
    snapshot?.status === 'PENDIENTE' || snapshot?.status === 'PROCESANDO';

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

  const appliedRoutineId = finalize.data?.routineId;
  useEffect(() => {
    if (!appliedRoutineId) return;
    // Navegar primero: al refrescar, la rutina anterior pasa a DESCARTADA.
    onApplied?.(appliedRoutineId);
    void invalidateRoutines();
    // Sólo cuando aparece la rutina nueva.
  }, [appliedRoutineId]);

  const reset = () => {
    setRequestId(undefined);
    setChanges('');
    setIdempotencyKey(crypto.randomUUID());
    request.reset();
    finalize.reset();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cambios = changes.trim();
    if (!cambios) return;
    try {
      const accepted = await request.mutateAsync({ cambios, idempotencyKey });
      setRequestId(accepted.requestId);
    } catch {
      // El error queda en request.error; la clave se conserva para reintentar.
    }
  };

  const failed =
    snapshot?.status === 'NO_DISPONIBLE' ||
    snapshot?.status === 'CANCELADA' ||
    finalize.isError;
  const done = Boolean(appliedRoutineId || snapshot?.routineId);

  return (
    <BentoCard>
      <p className="eyebrow text-[#77756d]">Pedir cambios</p>
      <p className="mt-2 text-xs leading-5 text-[#77756d]">
        {esEntrenador
          ? 'Escribí qué querés distinto y la IA ajusta esta propuesta. La nueva versión la reemplaza y sigue pendiente de tu revisión.'
          : 'Escribí qué querés distinto y la IA ajusta esta propuesta. La nueva versión la reemplaza y tu entrenador la revisa antes de ponerla en vigencia.'}
      </p>

      {!requestId ? (
        <form
          onSubmit={(event) => void submit(event)}
          aria-label="Pedir cambios"
          className="mt-4 flex flex-col gap-3"
        >
          <label
            htmlFor="routine-change-request"
            className="eyebrow text-[#77756d]"
          >
            Cambios
          </label>
          <textarea
            id="routine-change-request"
            value={changes}
            onChange={(event) => setChanges(event.target.value)}
            rows={3}
            maxLength={2000}
            required
            placeholder="Por ejemplo: sumá un día de piernas y sacá el press militar."
            className="rounded-xl border border-[#292823]/15 bg-white px-3.5 py-3 text-sm font-medium text-ink outline-none transition focus:border-graphite"
          />
          {request.error ? (
            <p role="alert" className="text-coral-strong text-xs font-medium">
              {requestErrorMessage(request.error, esEntrenador)}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={request.isPending || changes.trim().length === 0}
            className="w-fit rounded-full bg-graphite px-4 py-2.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {request.isPending ? 'Enviando…' : 'Pedir cambios'}
          </button>
        </form>
      ) : (
        <div className="mt-4">
          {generation.error ? (
            <Banner
              variant="danger"
              title="No pudimos consultar el pedido"
              actions={
                <button
                  type="button"
                  onClick={() => void generation.refetch()}
                  className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  Reintentar
                </button>
              }
            />
          ) : null}
          {isActive || (!snapshot && !generation.error) ? (
            <p role="status" className="text-xs font-semibold text-[#77756d]">
              La IA está aplicando los cambios. Podés esperar en esta pantalla.
            </p>
          ) : null}
          {snapshot?.status === 'COMPLETADA' && finalize.isPending ? (
            <p role="status" className="text-xs font-semibold text-[#77756d]">
              Validando la nueva propuesta…
            </p>
          ) : null}
          {done ? (
            <Banner variant="info" title="Cambios aplicados">
              <p>
                La rutina propuesta se actualizó y quedó lista para revisión.
              </p>
            </Banner>
          ) : null}
          {failed ? (
            <Banner
              variant="danger"
              title="No se pudieron aplicar los cambios"
              actions={
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  Probar de nuevo
                </button>
              }
            >
              <p>
                {finalize.error
                  ? requestErrorMessage(finalize.error, esEntrenador)
                  : (snapshot?.reason ??
                    'La IA no pudo cumplir el pedido. Reformulalo y probá de nuevo.')}
              </p>
              {snapshot?.violaciones?.length ? (
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
