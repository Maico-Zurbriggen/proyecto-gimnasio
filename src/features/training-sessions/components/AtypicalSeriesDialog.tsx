import { AlertTriangle } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

export interface AtypicalSeriesDialogProps {
  position: number;
  exerciseName: string | null;
  load: string;
  reps: string;
  onConfirm: () => void;
  /** Cierra sin registrar; quien lo abre devuelve el foco al campo de carga. */
  onCorrect: () => void;
}

/**
 * Confirmación de un valor atípico (HU36, RN-55a): la carga supera el 150% del
 * mejor histórico del ejercicio y el backend la rechazó sin confirmación.
 */
export function AtypicalSeriesDialog({
  position,
  exerciseName,
  load,
  reps,
  onConfirm,
  onCorrect,
}: AtypicalSeriesDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const confirmed = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    return () => {
      if (node?.open) node.close();
    };
  }, []);

  const confirm = () => {
    if (confirmed.current) return;
    confirmed.current = true;
    onConfirm();
  };

  return (
    <dialog
      ref={dialog}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onCorrect();
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-[#f7f6ef] p-5 text-[#252720] shadow-xl backdrop:bg-black/50 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-[#b8790c]"
        />
        <h2
          id={titleId}
          className="font-display text-lg font-semibold tracking-tight"
        >
          ¿Confirmás este valor atípico?
        </h2>
      </div>
      <div id={descriptionId} className="mt-3 flex flex-col gap-3 text-sm">
        <p>
          Serie {position}
          {exerciseName ? ` · ${exerciseName}` : ''}: la carga supera el 150% de
          tu mejor marca en este ejercicio.
        </p>
        <p className="rounded-2xl border border-[#292823]/15 bg-white px-4 py-3 text-center">
          <span className="block text-xs font-semibold text-[#68675f]">
            Valor ingresado
          </span>
          <span className="font-display text-2xl font-bold tabular-nums">
            {load === '' ? '—' : `${load} kg`}
          </span>
          {reps !== '' ? (
            <span className="block text-sm tabular-nums">× {reps} reps</span>
          ) : null}
        </p>
        <p>Si lo tipeaste mal, corregilo antes de registrar.</p>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          autoFocus
          onClick={onCorrect}
          className="btn-secondary min-h-11"
        >
          Corregir
        </button>
        <button
          type="button"
          onClick={confirm}
          className="btn-primary min-h-11"
        >
          Confirmar y registrar
        </button>
      </div>
    </dialog>
  );
}
