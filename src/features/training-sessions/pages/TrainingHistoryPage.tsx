import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import type { HistoryStateFilter } from '../../../api/trainingSessions';
import { Banner } from '../../../shared/components/Banner';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import {
  useTrainingHistory,
  useTrainingSessionDetail,
} from '../hooks/useTrainingSession';
import { formatDuration } from '../lib/sessionElapsed';

const STATE_FILTERS: { value: HistoryStateFilter; label: string }[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'EN_CURSO', label: 'En curso' },
  { value: 'COMPLETADA', label: 'Completadas' },
  { value: 'ABANDONADA', label: 'Abandonadas' },
  { value: 'BLOQUEADA', label: 'Bloqueadas' },
];

const STATE_LABELS: Record<string, string> = {
  EN_CURSO: 'En curso',
  COMPLETADA: 'Completada',
  ABANDONADA: 'Abandonada',
  BLOQUEADA: 'Bloqueada',
};

/** Fecha `YYYY-MM-DD` como día local, sin corrimientos de zona horaria. */
function formatOccurredOn(occurredOn: string): string {
  const [year, month, day] = occurredOn.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1).toLocaleDateString(
    'es',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );
}

function SessionDetail({
  studentId,
  sessionId,
}: {
  studentId: string;
  sessionId: string;
}) {
  const detail = useTrainingSessionDetail(studentId, sessionId);

  if (detail.isPending) {
    return <p role="status">Cargando el detalle…</p>;
  }

  if (detail.isError) {
    return (
      <Banner
        variant="danger"
        title="No pudimos cargar el detalle"
        actions={
          <button
            type="button"
            onClick={() => void detail.refetch()}
            disabled={detail.isFetching}
            className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            Reintentar
          </button>
        }
      >
        <p>Probá de nuevo en unos segundos.</p>
      </Banner>
    );
  }

  const completed = detail.data.setRecords.filter((r) => r.completed).length;
  return (
    <div className="mt-3 border-t border-black/10 pt-3">
      <p className="text-xs text-[#55534c]">
        {completed} de {detail.data.setRecords.length} series completadas
        {detail.data.aptitudeWarning ? ' · aptitud observada al iniciar' : ''}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {detail.data.setRecords.map((record) => (
          <li
            key={record.position}
            className="rounded-lg bg-black/[0.03] p-2 text-xs"
          >
            <p className="font-semibold">
              Serie {record.position} ·{' '}
              {record.performedExerciseName ?? record.prescribedExerciseName}
              {record.completed ? ' ✓' : ''}
            </p>
            <p className="mt-0.5 text-[#55534c]">
              Prescripto: {record.prescribedMinRepetitions}–
              {record.prescribedMaxRepetitions} reps
              {record.prescribedLoad !== null
                ? ` · ${record.prescribedLoad} kg`
                : ''}
            </p>
            <p className="mt-0.5 text-[#55534c]">
              Ejecutado:{' '}
              {record.performedRepetitions !== null ||
              record.performedLoad !== null
                ? `${record.performedRepetitions ?? '–'} reps · ${record.performedLoad ?? '–'} kg`
                : 'sin registro'}
              {record.perceivedEffort !== null
                ? ` · esfuerzo ${record.perceivedEffort}`
                : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface TrainingHistoryPageProps {
  studentId: string;
}

/**
 * Historial de sesiones (RF-035, D4/PD-02).
 * Cada sesión conserva su prescripción congelada junto a lo ejecutado:
 * el pasado no se reescribe aunque la rutina cambie de versión.
 */
export function TrainingHistoryPage({ studentId }: TrainingHistoryPageProps) {
  const [filter, setFilter] = useState<HistoryStateFilter>('TODAS');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const history = useTrainingHistory(studentId, filter, page);
  const totalPages = Math.max(
    1,
    Math.ceil((history.data?.total ?? 0) / (history.data?.pageSize ?? 10)),
  );

  return (
    <div>
      <PageHeader
        kicker="Historial"
        title="Tu entrenamiento, con contexto"
        description="Sesiones realizadas, con lo prescripto y lo ejecutado de cada una."
      />
      <main className="flex flex-col gap-4 px-4 pb-10 sm:px-7 lg:px-9">
        <BentoCard>
          <label
            htmlFor="history-state-filter"
            className="text-xs font-semibold"
          >
            Filtrar por estado
          </label>
          <select
            id="history-state-filter"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as HistoryStateFilter);
              setPage(1);
              setExpandedId(null);
            }}
            className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm"
          >
            {STATE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </BentoCard>

        {history.isPending ? <p role="status">Cargando tu historial…</p> : null}

        {history.isError && !history.isPending ? (
          <Banner
            variant="danger"
            title="No pudimos cargar tu historial"
            actions={
              <button
                type="button"
                onClick={() => void history.refetch()}
                disabled={history.isFetching}
                className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-60"
              >
                Reintentar
              </button>
            }
          >
            <p>
              {history.error instanceof ApiError &&
              (history.error.status === 401 || history.error.status === 403)
                ? 'No hay un alumno identificado para esta consulta.'
                : 'Probá de nuevo en unos segundos.'}
            </p>
          </Banner>
        ) : null}

        {!history.isPending &&
        !history.isError &&
        history.data.items.length === 0 ? (
          <BentoCard>
            <h2 className="text-sm font-semibold">Sin sesiones todavía</h2>
            <p className="mt-2 text-sm text-[#55534c]">
              Cuando completes tu primera sesión la vas a ver acá, con cada
              serie prescripta y ejecutada.
            </p>
            <Link
              to="/alumno/sesion"
              className="mt-3 inline-block rounded-full bg-graphite px-4 py-2 text-xs font-bold text-white"
            >
              Ir a la sesión
            </Link>
          </BentoCard>
        ) : null}

        {!history.isPending &&
        !history.isError &&
        history.data.items.length > 0 ? (
          <BentoCard>
            <ul className="flex flex-col gap-3">
              {history.data.items.map((item) => {
                const expanded = expandedId === item.id;
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-black/10 p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-sm font-semibold">
                        {formatOccurredOn(item.occurredOn)} ·{' '}
                        {item.routineDayName}
                      </h2>
                      <span className="shrink-0 rounded-full bg-black/[0.06] px-2 py-0.5 text-[11px] font-bold">
                        {STATE_LABELS[item.state] ?? item.state}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#55534c]">
                      {item.completedSeries} de {item.totalSeries} series
                      {formatDuration(item.startedAt, item.completedAt)
                        ? ` · ${formatDuration(item.startedAt, item.completedAt)}`
                        : ''}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : item.id)}
                        aria-expanded={expanded}
                        className="rounded-full border border-black/20 px-3 py-1.5 text-xs font-bold"
                      >
                        {expanded ? 'Ocultar detalle' : 'Ver detalle'}
                      </button>
                      {item.state === 'EN_CURSO' ? (
                        <Link
                          to="/alumno/sesion"
                          className="rounded-full bg-graphite px-3 py-1.5 text-xs font-bold text-white"
                        >
                          Retomar
                        </Link>
                      ) : null}
                    </div>
                    {expanded ? (
                      <SessionDetail
                        studentId={studentId}
                        sessionId={item.id}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                disabled={page <= 1}
                className="rounded-full border border-black/20 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                Anterior
              </button>
              <p className="text-xs text-[#77756d]" role="status">
                Página {history.data.page} de {totalPages} ·{' '}
                {history.data.total} sesiones
              </p>
              <button
                type="button"
                onClick={() => setPage((previous) => previous + 1)}
                disabled={page >= totalPages}
                className="rounded-full border border-black/20 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </BentoCard>
        ) : null}
      </main>
    </div>
  );
}
