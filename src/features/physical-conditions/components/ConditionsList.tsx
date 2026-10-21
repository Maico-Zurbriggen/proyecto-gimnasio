import type { ReactNode } from 'react';

import {
  BODY_ZONE_LABELS,
  type PhysicalCondition,
  type Severity,
} from '../../../api/conditions';
import { formatDate } from '../../../shared/lib/format';

/** Criterio front 9: la severidad se lee como texto, además del color. */
const SEVERIDAD: Record<Severity, { texto: string; clase: string }> = {
  LEVE: { texto: 'Leve', clase: 'chip-neutral' },
  MODERADA: { texto: 'Moderada', clase: 'chip-warn' },
  SEVERA: { texto: 'Severa', clase: 'chip-danger' },
};

export function SeverityChip({ severity }: { severity: Severity }) {
  const s = SEVERIDAD[severity];
  return <span className={s.clase}>Severidad: {s.texto}</span>;
}

/**
 * Condiciones vigentes y, aparte, el historial de las cerradas con su fecha de
 * fin (HU11 - criterio front 8). Las fechas son días (`YYYY-MM-DD`): no se
 * corren por la zona horaria del navegador.
 */
export function ConditionsList({
  conditions,
  action,
}: {
  conditions: PhysicalCondition[];
  /** Acción por condición vigente (cerrar); el entrenador no tiene ninguna. */
  action?: (condition: PhysicalCondition) => ReactNode;
}) {
  // Se separan por fecha de fin y no por `vigente`: una condición cerrada hoy
  // rige hasta el fin del día, pero ya no se puede volver a cerrar.
  const vigentes = conditions.filter((c) => c.endsOn === null);
  const cerradas = conditions.filter((c) => c.endsOn !== null);

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="condiciones-vigentes">
        <h3
          id="condiciones-vigentes"
          className="eyebrow mb-2 flex items-center gap-2 text-[#5f5d55]"
        >
          Vigentes
          <span className="chip-neutral tracking-normal">
            {vigentes.length}
          </span>
        </h3>
        {vigentes.length === 0 ? (
          <p className="surface-muted text-center text-sm text-[#68675f]">
            No hay condiciones vigentes.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {vigentes.map((c) => (
              <li
                key={c.id}
                className="card-interactive flex flex-col gap-2 rounded-2xl border border-[#292823]/8 bg-white/70 p-4 hover:bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">
                    {BODY_ZONE_LABELS[c.bodyZoneCode] ?? c.bodyZoneCode}
                  </p>
                  <SeverityChip severity={c.severity} />
                </div>
                <p className="text-xs text-[#68675f]">
                  Desde el {formatDate(c.startsOn)}
                </p>
                {c.description ? (
                  <p className="text-xs text-[#68675f]">{c.description}</p>
                ) : null}
                {action ? action(c) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {cerradas.length > 0 ? (
        <section aria-labelledby="condiciones-historial">
          <h3
            id="condiciones-historial"
            className="eyebrow mb-2 flex items-center gap-2 text-[#5f5d55]"
          >
            Historial
            <span className="chip-neutral tracking-normal">
              {cerradas.length}
            </span>
          </h3>
          <ul className="flex flex-col gap-2">
            {cerradas.map((c) => (
              <li
                key={c.id}
                className="surface-muted row-interactive flex flex-col gap-1 text-[#68675f]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {BODY_ZONE_LABELS[c.bodyZoneCode] ?? c.bodyZoneCode}
                  </p>
                  <SeverityChip severity={c.severity} />
                </div>
                <p className="text-xs">
                  Del {formatDate(c.startsOn)}
                  {c.endsOn ? ` al ${formatDate(c.endsOn)}` : ''} · cerrada
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
