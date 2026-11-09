import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dumbbell, Calendar, AlertTriangle } from 'lucide-react';

import { getTaxonomies } from '../../../api/catalog';
import { InsufficientInfo } from '../../../shared/components/InsufficientInfo';
import { toDateKey } from '../../../shared/lib/date';
import { humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { MuscleMap } from '../../exercise-catalog/MuscleMap';
import { useMuscleActivity } from '../hooks/useIndicators';

function getPeriodDates(weeks: number): { from: string; to: string } {
  const now = new Date();
  const past = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
  return {
    from: toDateKey(past),
    to: toDateKey(now),
  };
}

export function MuscleActivityCard({ studentId }: { studentId: string }) {
  const [weeks, setWeeks] = useState<number>(4);
  const period = getPeriodDates(weeks);

  const activityQuery = useMuscleActivity(studentId, period);
  const taxonomiesQuery = useQuery({
    queryKey: ['catalog', 'taxonomies'],
    queryFn: ({ signal }) => getTaxonomies(signal),
  });

  const muscleTaxonomies = taxonomiesQuery.data?.muscles ?? [];

  return (
    <BentoCard className="col-span-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Dumbbell className="size-4 text-[#586d26]" />
            <p className="eyebrow text-[#77756d]">Distribución de estímulo</p>
          </div>
          <h2 className="font-display mt-1 text-xl font-semibold tracking-tight text-[#1f1e1a]">
            Volumen y frecuencia por grupo muscular
          </h2>
          <p className="mt-1 text-xs text-[#77756d]">
            Series efectivas = 1,0 × series primarias + 0,5 × series secundarias
          </p>
        </div>

        {/* Selector de período */}
        <div className="flex items-center gap-1.5 self-start rounded-lg border border-[#e4e1d6] bg-[#f6f5f0] p-1 text-xs">
          <Calendar className="ml-1 size-3.5 text-[#77756d]" />
          {[4, 8, 12].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeeks(w)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                weeks === w
                  ? 'bg-white text-[#1f1e1a] shadow-xs font-semibold'
                  : 'text-[#77756d] hover:text-[#1f1e1a]'
              }`}
            >
              {w} semanas
            </button>
          ))}
        </div>
      </div>

      {activityQuery.isPending ? (
        <div className="mt-6">
          <LoadingState label="Calculando volumen y frecuencia por grupo muscular…" />
        </div>
      ) : activityQuery.isError ? (
        <div className="mt-4 rounded-xl border border-[#fbe1dc] bg-[#fff5f4] p-4 text-sm text-[#9b2c1f]">
          No pudimos calcular la actividad muscular del período. Intentá nuevamente.
        </div>
      ) : activityQuery.data.insufficientData ? (
        <div className="mt-6">
          <InsufficientInfo
            missing={activityQuery.data.insufficientData.missing}
            required={activityQuery.data.insufficientData.required}
            available={activityQuery.data.insufficientData.available}
            unit={activityQuery.data.insufficientData.unit}
            action={activityQuery.data.insufficientData.action}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {activityQuery.data.unclassifiedSets > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-[#fbeccb] bg-[#fffcf5] p-3 text-xs text-[#8a5a00]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#8a5a00]" />
              <p>
                Hay <strong>{activityQuery.data.unclassifiedSets}</strong> series completadas
                cuyos ejercicios aún no tienen clasificación muscular en el catálogo. No suman
                volumen a ningún grupo pero están registradas.
              </p>
            </div>
          )}

          {(() => {
            const groupsWithVolume = activityQuery.data.groups
              .filter((g) => (g.volume ?? 0) > 0)
              .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

            const maxVolume = Math.max(
              ...activityQuery.data.groups.map((g) => g.volume ?? 0),
              1,
            );

            // Músculos activos para el mapa 2D
            const primaryCodes = groupsWithVolume.slice(0, 3).map((g) => g.group);
            const secondaryCodes = groupsWithVolume.slice(3).map((g) => g.group);

            if (groupsWithVolume.length === 0) {
              return (
                <div className="rounded-xl border border-[#e4e1d6] bg-[#fdfdfc] p-6 text-center text-sm text-[#77756d]">
                  No se registraron series de trabajo en los ejercicios clasificados durante este período.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Barras y lista de grupos musculares */}
                <div className="space-y-3 lg:col-span-7">
                  <h3 className="eyebrow text-[#77756d]">
                    Grupos estimulados ({groupsWithVolume.length})
                  </h3>

                  <div className="space-y-2.5">
                    {groupsWithVolume.map((group) => {
                      const volume = group.volume ?? 0;
                      const frequency = group.frequency ?? 0;
                      const percentage = Math.round((volume / maxVolume) * 100);

                      return (
                        <div
                          key={group.group}
                          className="surface-muted rounded-xl p-3 transition-colors hover:bg-[#edebe2]"
                        >
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-[#1f1e1a]">
                              {humanizeEnum(group.group)}
                            </span>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="font-semibold text-[#1f1e1a]">
                                {volume} {volume === 1 ? 'serie ef.' : 'series ef.'}
                              </span>
                              <span className="text-[#77756d]">
                                {frequency} {frequency === 1 ? 'sesión' : 'sesiones'}
                              </span>
                            </div>
                          </div>

                          <div
                            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e4e1d6]"
                            role="progressbar"
                            aria-valuenow={volume}
                            aria-valuemin={0}
                            aria-valuemax={maxVolume}
                            aria-label={`Volumen de ${humanizeEnum(group.group)}`}
                          >
                            <div
                              className="h-full rounded-full bg-[#586d26] transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mapa muscular representativo */}
                <div className="lg:col-span-5">
                  <div className="surface-muted rounded-2xl p-4">
                    <p className="eyebrow mb-2 text-center text-[#77756d]">
                      Zonas estimuladas en el período
                    </p>
                    <MuscleMap
                      primary={primaryCodes}
                      secondary={secondaryCodes}
                      muscles={muscleTaxonomies}
                      compact
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </BentoCard>
  );
}
