import { InsufficientInfo } from '../../../shared/components/InsufficientInfo';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { useAdherence } from '../hooks/useIndicators';

export function AdherenceCard({ studentId }: { studentId: string }) {
  const query = useAdherence(studentId);

  if (query.isPending) {
    return (
      <BentoCard>
        <LoadingState label="Cargando adherencia…" />
      </BentoCard>
    );
  }

  if (query.isError) {
    return (
      <BentoCard>
        <p className="eyebrow text-[#77756d]">Adherencia</p>
        <p className="mt-2 text-sm text-[#9b2c1f]">
          No pudimos cargar tu adherencia.
        </p>
      </BentoCard>
    );
  }

  const { adherencia } = query.data;

  return (
    <BentoCard className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <p className="eyebrow text-[#77756d]">Adherencia</p>
          <span className="text-xs text-[#77756d]">
            Últimas 4 semanas completas
          </span>
        </div>

        {adherencia.disponible ? (
          <div className="mt-3 space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold tracking-tight text-[#1f1e1a]">
                {Math.round(adherencia.porcentaje)}%
              </span>
              <span className="text-sm text-[#77756d]">de asistencia</span>
            </div>

            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-[#e4e1d6]"
              role="progressbar"
              aria-valuenow={Math.round(adherencia.porcentaje)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Porcentaje de adherencia"
            >
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  adherencia.porcentaje >= 80
                    ? 'bg-[#3f6b1f]'
                    : adherencia.porcentaje >= 50
                      ? 'bg-[#8a5a00]'
                      : 'bg-[#9b2c1f]'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, adherencia.porcentaje))}%`,
                }}
              />
            </div>

            <p className="text-sm text-[#3d3c36]">
              Completaste <strong>{adherencia.sesionesCompletadas}</strong> de
              las <strong>{adherencia.sesionesEsperadas}</strong> sesiones
              esperadas por tu rutina vigente.
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <InsufficientInfo
              missing={adherencia.missing}
              required={adherencia.required}
              available={adherencia.available}
              unit={adherencia.unit}
              action={adherencia.action}
            />
          </div>
        )}
      </div>
    </BentoCard>
  );
}
