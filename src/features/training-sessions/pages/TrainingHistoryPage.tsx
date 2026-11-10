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
import { LoadingState } from '../../../shared/ui/LoadingState';

const STATE_FILTERS: { value: HistoryStateFilter; label: string }[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'EN_CURSO', label: 'En curso' },
  { value: 'COMPLETADA', label: 'Completadas' },
  { value: 'ABANDONADA', label: 'Abandonadas' },
  { value: 'BLOQUEADA', label: 'Bloqueadas' },
];

const STATE_CHIPS: Record<string, string> = {
  EN_CURSO: 'chip-warn shrink-0',
  COMPLETADA: 'chip-ok shrink-0',
  ABANDONADA: 'chip-danger shrink-0',
  BLOQUEADA: 'chip-neutral shrink-0',
};

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

function SimulatedChip() {
  return <span className="chip-neutral shrink-0">Simulada</span>;
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
    return <LoadingState label="Cargando el detalle…" variant="card" />;
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
            className="btn-primary btn-sm"
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
    <div className="mt-4 border-t border-[#292823]/10 pt-4">
      {detail.data.simulated ? (
        <p className="mb-2">
          <SimulatedChip />
        </p>
      ) : null}
      {detail.data.state === 'ABANDONADA' ? (
        <p className="mb-2 text-xs font-semibold text-[#8f2d2d]">
          Esta sesión quedó interrumpida antes de completarse.
        </p>
      ) : null}
      <p className="text-xs font-semibold text-[#68675f]">
        {completed} de {detail.data.setRecords.length} series completadas
        {detail.data.aptitudeWarning ? ' · aptitud observada al iniciar' : ''}
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {detail.data.setRecords.map((record) => {
          const omitted =
            !record.additional &&
            !record.completed &&
            record.omissionReason !== null;
          const substituted =
            record.prescribedExerciseName !== null &&
            record.performedExerciseName !== null &&
            record.performedExerciseName !== record.prescribedExerciseName;
          return (
            <li key={record.position} className="surface-muted p-3 text-xs">
              <p className="font-semibold [overflow-wrap:anywhere]">
                Serie {record.position} ·{' '}
                {record.performedExerciseName ?? record.prescribedExerciseName}
                {record.completed ? ' ✓' : ''}
                {record.additional ? (
                  <span className="chip-ok ml-2">Adicional</span>
                ) : null}
                {omitted ? (
                  <span className="chip-warn ml-2">Omitida</span>
                ) : null}
              </p>
              {substituted ? (
                <p className="mt-0.5 [overflow-wrap:anywhere]">
                  Prescripto: {record.prescribedExerciseName} → Ejecutado:{' '}
                  {record.performedExerciseName}
                </p>
              ) : null}
              {omitted ? (
                <p className="mt-0.5 text-[#68675f]">
                  Motivo: {record.omissionReason}
                </p>
              ) : null}
              <p className="mt-0.5 text-[#68675f]">
                {record.additional ||
                record.prescribedMinRepetitions === null ||
                record.prescribedMaxRepetitions === null
                  ? 'Serie agregada por el alumno, sin prescripción'
                  : `Prescripto: ${record.prescribedMinRepetitions}–${record.prescribedMaxRepetitions} reps${
                      record.prescribedLoad !== null
                        ? ` · ${record.prescribedLoad} kg`
                        : ''
                    }`}
              </p>
              <p className="mt-0.5 text-[#68675f]">
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
          );
        })}
      </ul>
    </div>
  );
}

export interface TrainingHistoryPageProps {
  studentId: string;
  /** Vista del entrenador: sin cabecera propia ni acciones del alumno. */
  readOnly?: boolean;
}

/**
 * Historial de sesiones (RF-035, D4/PD-02).
 * Cada sesión conserva su prescripción congelada junto a lo ejecutado:
 * el pasado no se reescribe aunque la rutina cambie de versión.
 */
export function TrainingHistoryPage({
  studentId,
  readOnly = false,
}: TrainingHistoryPageProps) {
  const [filter, setFilter] = useState<HistoryStateFilter>('TODAS');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const history = useTrainingHistory(studentId, filter, page);
  const totalPages = Math.max(
    1,
    Math.ceil((history.data?.total ?? 0) / (history.data?.pageSize ?? 10)),
  );

  const Body = readOnly ? 'div' : 'main';
  return (
    <div>
      {readOnly ? null : (
        <PageHeader
          kicker="Historial"
          title="Tu entrenamiento, con contexto"
          description="Sesiones realizadas, con lo prescripto y lo ejecutado de cada una."
        />
      )}
      <Body
        className={
          readOnly ? 'flex flex-col gap-6' : 'page-body flex flex-col gap-6'
        }
      >
        <BentoCard>
          <div className="flex flex-col gap-3 border-b border-[#292823]/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow text-[#77756d]">Registro de sesiones</p>
              <h2 className="font-display mt-1 text-lg font-semibold tracking-tight">
                Historial de actividad
              </h2>
            </div>
            <div className="flex items-center gap-2.5">
              <label
                htmlFor="history-state-filter"
                className="field-label whitespace-nowrap"
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
                className="field w-auto px-3 py-1.5 text-xs font-semibold"
              >
                {STATE_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5">
            {history.isPending ? (
              <LoadingState label="Cargando tu historial…" variant="list" />
            ) : null}

            {history.isError && !history.isPending ? (
              <Banner
                variant="danger"
                title="No pudimos cargar tu historial"
                actions={
                  <button
                    type="button"
                    onClick={() => void history.refetch()}
                    disabled={history.isFetching}
                    className="btn-primary btn-sm"
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
              <div className="surface-muted py-10 text-center">
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  Sin sesiones todavía
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#68675f]">
                  {readOnly
                    ? 'Este alumno todavía no registró sesiones.'
                    : 'Cuando completes tu primera sesión la vas a ver acá, con cada serie prescripta y ejecutada.'}
                </p>
                {readOnly ? null : (
                  <Link to="/alumno/sesion" className="btn-primary mt-4">
                    Ir a la sesión
                  </Link>
                )}
              </div>
            ) : null}

            {!history.isPending &&
            !history.isError &&
            history.data.items.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {history.data.items.map((item) => {
                  const expanded = expandedId === item.id;
                  return (
                    <li
                      key={item.id}
                      className="card-interactive rounded-2xl border border-[#292823]/10 bg-white/90 p-4 shadow-xs hover:border-[#292823]/30 hover:bg-white sm:p-5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="min-w-0 text-sm font-bold [overflow-wrap:anywhere]">
                          {formatOccurredOn(item.occurredOn)} ·{' '}
                          {item.routineDayName ??
                            'Sesión sin detalle de rutina'}
                        </h2>
                        <span className="flex flex-wrap gap-1">
                          {item.simulated ? <SimulatedChip /> : null}
                          <span
                            className={
                              STATE_CHIPS[item.state] ?? 'chip-neutral shrink-0'
                            }
                          >
                            {STATE_LABELS[item.state] ?? item.state}
                          </span>
                        </span>
                      </div>
                      {item.state === 'ABANDONADA' ? (
                        <p className="mt-1 text-xs font-semibold text-[#8f2d2d]">
                          Interrumpida
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-[#68675f]">
                        {item.completedSeries} de {item.totalSeries} series
                        {formatDuration(item.startedAt, item.completedAt)
                          ? ` · ${formatDuration(item.startedAt, item.completedAt)}`
                          : ''}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expanded ? null : item.id)
                          }
                          aria-expanded={expanded}
                          className="btn-secondary btn-sm"
                        >
                          {expanded ? 'Ocultar detalle' : 'Ver detalle'}
                        </button>

                        {/* Las acciones de reanudar / iniciar sólo se ofrecen al alumno que
                            entrena, no al entrenador que consulta la ficha en solo lectura (FL-07). */}
                        {!readOnly && item.state === 'EN_CURSO' ? (
                          <Link
                            to="/alumno/sesion"
                            className="btn-primary btn-sm"
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
            ) : null}

            {!history.isPending && !history.isError && totalPages > 1 ? (
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#292823]/10 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setPage((previous) => Math.max(1, previous - 1))
                  }
                  disabled={page <= 1}
                  className="btn-secondary btn-sm"
                >
                  Anterior
                </button>
                <p className="text-center text-xs text-[#77756d]" role="status">
                  Página {history.data.page} de {totalPages} ·{' '}
                  {history.data.total} sesiones
                </p>
                <button
                  type="button"
                  onClick={() => setPage((previous) => previous + 1)}
                  disabled={page >= totalPages}
                  className="btn-secondary btn-sm"
                >
                  Siguiente
                </button>
              </div>
            ) : null}
          </div>
        </BentoCard>
      </Body>
    </div>
  );
}
