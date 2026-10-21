import { useEffect, useState, type FormEvent } from 'react';

import { Banner } from '../../../shared/components/Banner';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { useInvalidateRoutines } from '../../prescriptions/hooks/usePrescriptions';
import { useFinalizeRoutineGeneration } from '../hooks/useFinalizeRoutineGeneration';
import { useRequestRoutineGeneration } from '../hooks/useRequestRoutineGeneration';
import { useRoutineGeneration } from '../hooks/useRoutineGeneration';
import {
  changeRequestStatusMessage,
  requestErrorMessage,
} from '../lib/generationErrors';

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
      <p className="mt-2 text-sm leading-6 text-[#68675f]">
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
          <label htmlFor="routine-change-request" className="field-label">
            Cambios
          </label>
          <textarea
            id="routine-change-request"
            value={changes}
            onChange={(event) => setChanges(event.target.value)}
            rows={4}
            maxLength={2000}
            required
            placeholder="Por ejemplo: sumá un día de piernas y sacá el press militar."
            className="field min-h-28"
          />
          {request.error ? (
            <p role="alert" className="field-error">
              {requestErrorMessage(request.error, esEntrenador)}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={request.isPending || changes.trim().length === 0}
            className="btn-accent w-fit"
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
                  className="btn-primary btn-sm"
                >
                  Reintentar
                </button>
              }
            />
          ) : null}
          {isActive || (!snapshot && !generation.error) ? (
            <p
              role="status"
              className="surface-muted text-sm font-semibold text-[#68675f]"
            >
              La IA está aplicando los cambios. Podés esperar en esta pantalla.
            </p>
          ) : null}
          {snapshot?.status === 'COMPLETADA' && finalize.isPending ? (
            <p
              role="status"
              className="surface-muted text-sm font-semibold text-[#68675f]"
            >
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
                  className="btn-primary btn-sm"
                >
                  Probar de nuevo
                </button>
              }
            >
              <p>
                {finalize.error
                  ? requestErrorMessage(finalize.error, esEntrenador)
                  : changeRequestStatusMessage(snapshot)}
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
