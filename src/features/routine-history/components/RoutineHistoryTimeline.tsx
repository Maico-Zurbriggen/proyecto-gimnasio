import { useState } from 'react';

import type {
  RoutineHistoryEvent,
  RoutineHistoryItem,
} from '../../../api/routineHistory';
import { Banner } from '../../../shared/components/Banner';
import { humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { useRoutineHistory } from '../hooks/useRoutineHistory';

const EVENT_LABEL: Record<RoutineHistoryEvent['type'], string> = {
  ASIGNADA_DESDE_PLANTILLA: 'Asignada desde plantilla',
  GENERACION_SOLICITADA: 'Pedido de rutina',
  CAMBIO_SOLICITADO: 'Cambios pedidos sobre la propuesta',
  REGENERACION_ENTRENADOR: 'Regeneración pedida por el entrenador',
  RENOVACION_AUTOMATICA: 'Renovación automática',
  PROPUESTA_GENERADA: 'Propuesta generada por la IA',
  REVISION_ENTRENADOR: 'Decisión del entrenador',
  CAMBIO_DE_ESTADO: 'Cambio de estado',
};

const STATE_LABEL: Record<string, string> = {
  PROPUESTA: 'Propuesta',
  BLOQUEADA: 'Bloqueada',
  VIGENTE: 'Vigente',
  RECHAZADA: 'Rechazada',
  DESCARTADA: 'Descartada',
  ARCHIVADA: 'Archivada',
};

const ORIGIN_LABEL: Record<string, string> = {
  GENERADA: 'Generada con IA',
  PLANTILLA_ENTRENADOR: 'Plantilla del entrenador',
};

const dateTime = (value: string) =>
  new Date(value).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

function stateText(state: string): string {
  return STATE_LABEL[state] ?? humanizeEnum(state);
}

function eventDetail(event: RoutineHistoryEvent): string | null {
  if (event.type === 'CAMBIO_DE_ESTADO') {
    const from = event.data?.from;
    const to = event.data?.to;
    if (typeof to === 'string') {
      return typeof from === 'string'
        ? `${stateText(from)} → ${stateText(to)}`
        : stateText(to);
    }
  }
  return event.detail;
}

function EventRow({ event }: { event: RoutineHistoryEvent }) {
  const label =
    event.type === 'REVISION_ENTRENADOR' &&
    typeof event.data?.label === 'string'
      ? event.data.label
      : EVENT_LABEL[event.type];
  const detail = eventDetail(event);
  return (
    <li className="relative border-l border-[#292823]/15 pb-4 pl-4 last:pb-0">
      <span className="absolute -left-[4px] top-1.5 h-2 w-2 rounded-full bg-lime" />
      <p className="text-xs font-bold">
        {label}
        {event.actor ? (
          <span className="font-normal text-[#77756d]">
            {' '}
            · {event.actor.name}
          </span>
        ) : null}
      </p>
      <p className="text-[11px] text-[#77756d]">{dateTime(event.at)}</p>
      {detail ? (
        <p className="mt-1 whitespace-pre-line text-xs">{detail}</p>
      ) : null}
    </li>
  );
}

function RoutineEntry({
  item,
  defaultOpen,
}: {
  item: RoutineHistoryItem;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const generation = item.generation;
  return (
    <BentoCard className="p-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
      >
        <span>
          <span className="font-display block text-lg font-semibold tracking-[-0.04em]">
            {humanizeEnum(item.routineType)} · {item.targetWeeklyFrequency} días
          </span>
          <span className="block text-[11px] text-[#77756d]">
            {dateTime(item.requestedAt)} ·{' '}
            {ORIGIN_LABEL[item.origin] ?? humanizeEnum(item.origin)}
            {item.requestedBy ? ` · pedida por ${item.requestedBy.name}` : ''}
          </span>
        </span>
        <span className="rounded-full border border-[#292823]/10 bg-white px-3 py-1 text-[11px] font-bold">
          {stateText(item.state)}
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-3">
          {item.replacesRoutineId ? (
            <p className="text-[11px] text-[#77756d]">
              Reemplazó a una propuesta anterior tras un pedido de cambios.
            </p>
          ) : null}
          {item.replacedByRoutineId ? (
            <p className="text-[11px] text-[#77756d]">
              Fue reemplazada por una propuesta nueva.
            </p>
          ) : null}
          {generation ? (
            <p className="text-[11px] text-[#77756d]">
              Generación: {generation.attempts}{' '}
              {generation.attempts === 1 ? 'intento' : 'intentos'}
              {generation.modelVersion
                ? ` · modelo ${generation.modelVersion}`
                : ''}
              {item.versionCount > 1 ? ` · ${item.versionCount} versiones` : ''}
            </p>
          ) : null}
          <ol aria-label="Línea de tiempo de la rutina">
            {item.events.map((event, index) => (
              <EventRow
                key={`${event.type}-${event.at}-${String(index)}`}
                event={event}
              />
            ))}
          </ol>
        </div>
      ) : null}
    </BentoCard>
  );
}

export interface RoutineHistoryTimelineProps {
  studentId: string;
}

/** Todas las rutinas que tuvo el alumno con su flujo: pedidos, cambios y decisiones. */
export function RoutineHistoryTimeline({
  studentId,
}: RoutineHistoryTimelineProps) {
  const history = useRoutineHistory(studentId);

  if (history.isPending) {
    return <p className="text-xs text-[#77756d]">Cargando historial…</p>;
  }
  if (history.error) {
    return (
      <Banner
        variant="danger"
        title="No pudimos cargar el historial de rutinas."
      />
    );
  }
  if (history.data.length === 0) {
    return (
      <p className="text-xs text-[#77756d]">
        Todavía no hay rutinas en el historial.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {history.data.map((item, index) => (
        <RoutineEntry
          key={item.routineId}
          item={item}
          defaultOpen={index === 0}
        />
      ))}
    </div>
  );
}
