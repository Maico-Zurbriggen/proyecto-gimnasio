import type { SerieEnBorrador } from '../lib/sessionDraft';

export interface DraftSyncStatusProps {
  pendientes: SerieEnBorrador[];
  sincronizado: boolean;
  /** `false` cuando el borrador no pudo guardarse en el dispositivo. */
  respaldoLocalActivo: boolean;
  onReintentar: () => void;
}

/**
 * Estado de sincronización del borrador de la sesión (HU22 - T4, RNF-10).
 *
 * Lo que el alumno necesita saber es si su trabajo está a salvo, no si hay red.
 * Por eso el mensaje habla de series guardadas y pendientes de enviar: mientras
 * el respaldo local funcione, perder la conexión no le cuesta nada y no hay
 * motivo para alarmarlo. El único caso realmente malo es que el borrador no
 * pueda escribirse, y ése se avisa aparte.
 */
export function DraftSyncStatus({
  pendientes,
  sincronizado,
  respaldoLocalActivo,
  onReintentar,
}: DraftSyncStatusProps) {
  if (!respaldoLocalActivo) {
    return (
      <p
        role="alert"
        className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
      >
        No se puede guardar el respaldo en este dispositivo. Si cerrás la
        aplicación, lo que registres puede perderse: terminá la sesión sin
        cerrarla.
      </p>
    );
  }

  if (sincronizado) {
    return (
      <p role="status" className="px-3 py-2 text-sm text-slate-600">
        Todo guardado.
      </p>
    );
  }

  const cantidad = pendientes.length;
  const algunaFallo = pendientes.some((serie) => serie.intentos > 0);

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded border border-amber-300 bg-amber-50 px-3 py-2"
    >
      <p className="text-sm text-amber-900">
        {cantidad === 1
          ? '1 serie guardada en este dispositivo, pendiente de enviar.'
          : `${String(cantidad)} series guardadas en este dispositivo, pendientes de enviar.`}
        {algunaFallo ? ' Se reintenta al recuperar la conexión.' : null}
      </p>
      <button
        type="button"
        onClick={onReintentar}
        className="shrink-0 rounded border border-amber-400 px-2 py-1 text-sm text-amber-900"
      >
        Reintentar
      </button>
    </div>
  );
}
