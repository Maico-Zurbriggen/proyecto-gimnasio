import { Activity, RefreshCw } from 'lucide-react';

import { ApiError } from '../../../api/client';
import { humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { LoadingState } from '../../../shared/ui/LoadingState';
import {
  useEvolutionDiagnostic,
  useRecalculateEvolutionDiagnostic,
} from '../hooks/useEvolutionDiagnostic';

export interface EvolutionDiagnosticCardProps {
  studentId: string;
  allowRecalculate?: boolean;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function recalculationError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return 'El alumno necesita una rutina vigente para calcular el diagnóstico.';
  }
  if (error instanceof ApiError && error.status === 403) {
    return 'Sólo el entrenador asignado puede recalcular este diagnóstico.';
  }
  return 'No pudimos recalcular el diagnóstico. Intentá nuevamente.';
}

export function EvolutionDiagnosticCard({
  studentId,
  allowRecalculate = false,
}: EvolutionDiagnosticCardProps) {
  const diagnostic = useEvolutionDiagnostic(studentId);
  const recalculate = useRecalculateEvolutionDiagnostic(studentId);

  if (diagnostic.isPending) {
    return (
      <BentoCard>
        <LoadingState label="Consultando diagnóstico de evolución…" />
      </BentoCard>
    );
  }

  if (diagnostic.isError) {
    return (
      <BentoCard>
        <p className="eyebrow text-[#77756d]">Diagnóstico de evolución</p>
        <p role="alert" className="mt-2 text-sm text-[#9b2c1f]">
          No pudimos consultar el diagnóstico.
        </p>
        <button
          type="button"
          onClick={() => void diagnostic.refetch()}
          disabled={diagnostic.isFetching}
          className="btn-secondary btn-sm mt-3"
        >
          Reintentar
        </button>
      </BentoCard>
    );
  }

  const result = diagnostic.data;
  const action = allowRecalculate ? (
    <button
      type="button"
      onClick={() => recalculate.mutate()}
      disabled={recalculate.isPending}
      className="btn-secondary btn-sm inline-flex items-center gap-2"
    >
      <RefreshCw
        aria-hidden="true"
        className={`size-3.5 ${recalculate.isPending ? 'animate-spin' : ''}`}
      />
      {recalculate.isPending ? 'Calculando…' : 'Recalcular ahora'}
    </button>
  ) : null;

  if (!result.disponible) {
    return (
      <BentoCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow text-[#77756d]">Diagnóstico de evolución</p>
            <h2 className="font-display mt-2 text-lg font-semibold tracking-tight">
              Todavía no hay un diagnóstico calculado
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#68675f]">
              Se calculará con la actividad de la rutina vigente. La falta de
              diagnóstico no afecta las demás funciones.
            </p>
          </div>
          {action}
        </div>
        {recalculate.isError ? (
          <p role="alert" className="field-error mt-3">
            {recalculationError(recalculate.error)}
          </p>
        ) : null}
      </BentoCard>
    );
  }

  return (
    <BentoCard>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity aria-hidden="true" className="size-4 text-[#586d26]" />
            <p className="eyebrow text-[#77756d]">Diagnóstico de evolución</p>
          </div>
          <h2 className="font-display mt-2 text-xl font-semibold tracking-tight">
            {humanizeEnum(result.globalSituation)}
          </h2>
          {result.dataOrigin === 'SIMULATED' ? (
            <p className="chip-warn mt-2">
              Historial preparado para demostración · datos simulados
            </p>
          ) : null}
          <p className="mt-1 text-sm text-[#68675f]">
            Período {formatDate(result.periodStart)} –{' '}
            {formatDate(result.periodEnd)}
            {result.adherencia === null
              ? ' · adherencia no disponible'
              : ` · adherencia ${result.adherencia.toLocaleString('es-AR')} %`}
          </p>
        </div>
        {action}
      </div>

      {recalculate.isSuccess ? (
        <p role="status" className="mt-3 text-sm text-[#3f6b1f]">
          Diagnóstico recalculado correctamente.
        </p>
      ) : null}
      {recalculate.isError ? (
        <p role="alert" className="field-error mt-3">
          {recalculationError(recalculate.error)}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {result.ejercicios.map((exercise) => (
          <div key={exercise.exerciseId} className="surface-muted">
            <p className="text-sm font-semibold">{exercise.exerciseName}</p>
            <p className="mt-1 text-xs text-[#68675f]">
              {humanizeEnum(exercise.situation)}
            </p>
          </div>
        ))}
      </div>

      {result.criteriosNoEvaluados.length > 0 ? (
        <p className="mt-4 text-xs leading-relaxed text-[#68675f]">
          No se pudo evaluar:{' '}
          {result.criteriosNoEvaluados.map(humanizeEnum).join(', ')}.
        </p>
      ) : null}
    </BentoCard>
  );
}
