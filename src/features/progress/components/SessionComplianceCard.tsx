import { useQuery } from '@tanstack/react-query';

import { fetchTrainingSessions } from '../../../api/trainingSessions';
import { InsufficientInfo } from '../../../shared/components/InsufficientInfo';
import { formatDate } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { useSessionCompliance } from '../hooks/useIndicators';

export function SessionComplianceCard({ studentId }: { studentId: string }) {
  const sessionsQuery = useQuery({
    queryKey: ['training-sessions', studentId, 'latest-completed'],
    queryFn: ({ signal }) =>
      fetchTrainingSessions(
        studentId,
        { state: 'COMPLETADA', pageSize: 1 },
        signal,
      ),
    enabled: Boolean(studentId),
  });

  const latestSession = sessionsQuery.data?.items[0];
  const complianceQuery = useSessionCompliance(
    studentId,
    latestSession?.id ?? '',
  );

  if (sessionsQuery.isPending || (latestSession && complianceQuery.isPending)) {
    return (
      <BentoCard>
        <LoadingState label="Cargando cumplimiento…" />
      </BentoCard>
    );
  }

  if (sessionsQuery.isError || complianceQuery.isError) {
    return (
      <BentoCard>
        <p className="eyebrow text-[#77756d]">Cumplimiento</p>
        <p className="mt-2 text-sm text-[#9b2c1f]">
          No pudimos cargar el cumplimiento de tu última sesión.
        </p>
      </BentoCard>
    );
  }

  if (!latestSession) {
    return (
      <BentoCard>
        <p className="eyebrow text-[#77756d]">Cumplimiento</p>
        <div className="mt-3">
          <InsufficientInfo
            missing="sesión de entrenamiento completada"
            required={1}
            available={0}
            unit="sesiones"
            action="Registrá y finalizá tu primera sesión para ver tu cumplimiento de series y repeticiones."
          />
        </div>
      </BentoCard>
    );
  }

  const compliance = complianceQuery.data;
  if (!compliance) return null;

  const { cumplimientoDeSeries, cumplimientoDeRepeticiones } = compliance;

  return (
    <BentoCard className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <p className="eyebrow text-[#77756d]">
            Cumplimiento en última sesión
          </p>
          <span className="text-xs text-[#77756d]">
            {latestSession.routineDayName ?? 'Sesión'} ·{' '}
            {formatDate(latestSession.occurredOn)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Cumplimiento de series */}
          <div className="surface-muted rounded-xl p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#77756d]">
              Series prescriptas
            </span>
            {cumplimientoDeSeries.disponible ? (
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold tracking-tight text-[#1f1e1a]">
                    {Math.round(cumplimientoDeSeries.porcentaje)}%
                  </span>
                  <span className="text-xs text-[#77756d]">
                    ({cumplimientoDeSeries.numerador} de{' '}
                    {cumplimientoDeSeries.denominador})
                  </span>
                </div>
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e4e1d6]"
                  role="progressbar"
                  aria-valuenow={Math.round(cumplimientoDeSeries.porcentaje)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Cumplimiento de series"
                >
                  <div
                    className="h-full rounded-full bg-[#3f6b1f]"
                    style={{
                      width: `${Math.min(100, Math.max(0, cumplimientoDeSeries.porcentaje))}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <InsufficientInfo
                  missing={cumplimientoDeSeries.missing}
                  required={cumplimientoDeSeries.required}
                  available={cumplimientoDeSeries.available}
                  unit={cumplimientoDeSeries.unit}
                  action={cumplimientoDeSeries.action}
                />
              </div>
            )}
          </div>

          {/* Cumplimiento de repeticiones */}
          <div className="surface-muted rounded-xl p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#77756d]">
              Repeticiones
            </span>
            {cumplimientoDeRepeticiones.disponible ? (
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold tracking-tight text-[#1f1e1a]">
                    {Math.round(cumplimientoDeRepeticiones.porcentaje)}%
                  </span>
                  <span className="text-xs text-[#77756d]">
                    ({cumplimientoDeRepeticiones.numerador} de{' '}
                    {cumplimientoDeRepeticiones.denominador})
                  </span>
                </div>
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e4e1d6]"
                  role="progressbar"
                  aria-valuenow={Math.round(
                    cumplimientoDeRepeticiones.porcentaje,
                  )}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Cumplimiento de repeticiones"
                >
                  <div
                    className="h-full rounded-full bg-[#3f6b1f]"
                    style={{
                      width: `${Math.min(100, Math.max(0, cumplimientoDeRepeticiones.porcentaje))}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <InsufficientInfo
                  missing={cumplimientoDeRepeticiones.missing}
                  required={cumplimientoDeRepeticiones.required}
                  available={cumplimientoDeRepeticiones.available}
                  unit={cumplimientoDeRepeticiones.unit}
                  action={cumplimientoDeRepeticiones.action}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
