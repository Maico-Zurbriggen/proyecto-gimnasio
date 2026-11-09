import { formatDate } from '../../../shared/lib/format';
import type { BlockedStudentInfo } from '../types';
import { BlockedStudentBanner } from './BlockedStudentBanner';

export interface UnlockPanelProps {
  student: BlockedStudentInfo;
  /** Aprueba la regularización ya presentada por el alumno. */
  onUnlock: () => void;
  submitting?: boolean;
  errorMessage?: string | null;
}

/** Vista de aprobación del entrenador; nunca captura métricas del alumno. */
export function UnlockPanel({
  student,
  onUnlock,
  submitting = false,
  errorMessage,
}: UnlockPanelProps) {
  if (!student.bloqueado) {
    return null;
  }

  const readyForApproval =
    student.measurementBlockState === 'PENDIENTE_APROBACION';

  return (
    <div className="bento-card flex flex-col gap-5">
      <BlockedStudentBanner student={student} />

      {readyForApproval ? (
        <div className="surface-muted">
          <p className="eyebrow text-[#77756d]">Regularización presentada</p>
          <p className="mt-2 text-sm text-[#68675f]">
            El alumno ya cargó peso y altura
            {student.submittedAt
              ? ` el ${formatDate(student.submittedAt.slice(0, 10))}`
              : ''}
            . Revisá la información y aprobá el desbloqueo.
          </p>
        </div>
      ) : (
        <p className="text-sm text-[#68675f]">
          El alumno todavía debe cargar personalmente el peso y la altura
          pendientes. La aprobación se habilitará después de esa carga.
        </p>
      )}

      {errorMessage ? <p className="field-error">{errorMessage}</p> : null}

      <button
        type="button"
        disabled={!readyForApproval || submitting}
        onClick={() => onUnlock()}
        className="btn-accent self-start"
      >
        {submitting ? 'Aprobando…' : 'Aprobar desbloqueo'}
      </button>
    </div>
  );
}
