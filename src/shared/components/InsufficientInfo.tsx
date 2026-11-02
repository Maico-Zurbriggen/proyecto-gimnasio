import { Info } from 'lucide-react';

export interface InsufficientInfoProps {
  /** Qué información falta (ej. "sesiones del mismo ejercicio"). */
  missing: string;
  required?: number;
  available?: number;
  unit?: string;
  /** Qué hacer para completarla. */
  action?: string;
}

/** Explica que falta información (nunca un valor vacío o "—") y qué hacer al respecto. */
export function InsufficientInfo({
  missing,
  required,
  available,
  unit,
  action,
}: InsufficientInfoProps) {
  const counts =
    required !== undefined
      ? `Hacen falta ${required}${unit ? ` ${unit}` : ''} (${missing}). ${
          available !== undefined ? `Tenés ${available}.` : ''
        }`
      : `Falta información: ${missing}.`;
  return (
    <div
      role="status"
      className="flex min-w-0 items-start gap-2 text-sm leading-5 text-[#3d3c36]"
    >
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p className="m-0 min-w-0 break-words">
        {counts.trim()}
        {action ? ` ${action}` : ''}
      </p>
    </div>
  );
}
