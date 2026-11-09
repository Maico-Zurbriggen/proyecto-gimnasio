import { useId, useState } from 'react';

import { ApiError, fieldErrors } from '../../../api/client';
import type { ReviewResult } from '../../../api/prescriptions';

export interface RoutineReviewDecision {
  result: ReviewResult;
  observation?: string;
  confirmGoalMismatch?: boolean;
}

export interface RoutineReviewFormProps {
  /** El tipo de la rutina no coincide con el objetivo vigente (RN-40). */
  goalMismatch?: boolean;
  pending: boolean;
  approveDisabled?: boolean;
  error: unknown;
  onDecide: (decision: RoutineReviewDecision) => void;
}

function mensajeDeError(error: unknown): string | null {
  if (!(error instanceof ApiError)) {
    return error
      ? 'No pudimos registrar la decisión. Revisá tu conexión e intentá de nuevo.'
      : null;
  }
  switch (error.code) {
    case 'routine_not_reviewable':
      return 'Esta rutina ya fue resuelta (quizás desde otra pestaña). Actualizá la bandeja.';
    case 'forbidden_not_assigned':
      return 'Ya no tenés asignado a este alumno.';
    case 'goal_mismatch_confirmation_required':
    case 'rejection_reason_required':
      return null;
    default:
      return 'No pudimos registrar la decisión. Intentá de nuevo en un momento.';
  }
}

/**
 * Decisión del entrenador sobre una rutina propuesta (HU17, FL-02).
 *
 * Rechazar exige un motivo, que le llega al alumno (FL-02/A2). Si el tipo de
 * rutina no coincide con el objetivo vigente, aprobar exige confirmarlo
 * (RN-40): se avisa antes cuando la bandeja ya lo sabe, y también si el backend
 * lo detecta al aprobar.
 */
export function RoutineReviewForm({
  goalMismatch = false,
  pending,
  approveDisabled = false,
  error,
  onDecide,
}: RoutineReviewFormProps) {
  const ids = useId();
  const [observation, setObservation] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [motivoFaltante, setMotivoFaltante] = useState(false);

  const servidorPideConfirmacion =
    error instanceof ApiError &&
    error.code === 'goal_mismatch_confirmation_required';
  const pideConfirmacion = goalMismatch || servidorPideConfirmacion;
  const errorDeMotivo =
    motivoFaltante || Boolean(fieldErrors(error).observation?.length);
  const general = mensajeDeError(error);

  const idObservacion = `${ids}-observacion`;
  const idConfirmacion = `${ids}-confirmacion`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idObservacion} className="field-label">
          Observación para el alumno
        </label>
        <textarea
          id={idObservacion}
          rows={3}
          maxLength={500}
          value={observation}
          aria-invalid={errorDeMotivo || undefined}
          aria-describedby={`${idObservacion}-ayuda${errorDeMotivo ? ` ${idObservacion}-error` : ''}`}
          onChange={(event) => {
            setObservation(event.target.value);
            setMotivoFaltante(false);
          }}
          className="field"
        />
        <p id={`${idObservacion}-ayuda`} className="field-hint">
          Opcional al aprobar. Obligatoria al rechazar: es el motivo que va a
          leer el alumno.
        </p>
        {errorDeMotivo ? (
          <p id={`${idObservacion}-error`} className="field-error">
            <span aria-hidden="true">✕ </span>
            Para rechazar la rutina indicá el motivo.
          </p>
        ) : null}
      </div>

      {pideConfirmacion ? (
        <div className="rounded-xl border border-[#b8790c]/30 bg-[#fdf3e0] p-3 text-xs text-[#5a3d0c]">
          <p className="font-semibold">
            <span aria-hidden="true">! </span>
            El tipo de esta rutina no coincide con el objetivo vigente del
            alumno.
          </p>
          <label
            htmlFor={idConfirmacion}
            className="mt-2 flex items-start gap-2 font-medium"
          >
            <input
              id={idConfirmacion}
              type="checkbox"
              checked={confirmado}
              onChange={(event) => setConfirmado(event.target.checked)}
              className="check mt-0.5"
            />
            Lo revisé y quiero aprobarla igual.
          </label>
        </div>
      ) : null}

      {general ? (
        <p role="alert" className="text-coral-text text-xs font-semibold">
          {general}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={
            pending || approveDisabled || (pideConfirmacion && !confirmado)
          }
          aria-busy={pending}
          className="btn-primary"
          onClick={() =>
            onDecide({
              result: 'APROBADA',
              observation: observation.trim() || undefined,
              confirmGoalMismatch: pideConfirmacion ? confirmado : undefined,
            })
          }
        >
          {pending ? 'Registrando…' : 'Aprobar y poner en vigencia'}
        </button>
        <button
          type="button"
          disabled={pending}
          className="btn-danger"
          onClick={() => {
            if (!observation.trim()) {
              setMotivoFaltante(true);
              return;
            }
            onDecide({ result: 'RECHAZADA', observation: observation.trim() });
          }}
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}
