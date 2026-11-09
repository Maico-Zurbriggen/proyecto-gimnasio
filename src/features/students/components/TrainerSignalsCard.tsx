import { AlertCircle, AlertTriangle, CheckCircle2, TrendingDown, Activity } from 'lucide-react';

import { InsufficientInfo } from '../../../shared/components/InsufficientInfo';
import { humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { useSignals } from '../../progress/hooks/useIndicators';

export function TrainerSignalsCard({ studentId }: { studentId: string }) {
  const query = useSignals(studentId);

  if (query.isPending) {
    return (
      <BentoCard>
        <LoadingState label="Evaluando señales de seguimiento…" />
      </BentoCard>
    );
  }

  if (query.isError) {
    return (
      <BentoCard>
        <p className="eyebrow text-[#77756d]">Señales de seguimiento</p>
        <p className="mt-2 text-sm text-[#9b2c1f]">
          No pudimos consultar las señales del alumno.
        </p>
      </BentoCard>
    );
  }

  const { estancamiento, caidaDeAdherencia, desbalance, seriesSinClasificar } =
    query.data;

  const hasAnyDetected =
    estancamiento.some((s) => s.estado === 'DETECTADA') ||
    caidaDeAdherencia.estado === 'DETECTADA' ||
    desbalance.estado === 'DETECTADA';

  return (
    <BentoCard className="col-span-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-[#586d26]" />
          <p className="eyebrow text-[#77756d]">Seguimiento preventivo (6 semanas)</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            hasAnyDetected
              ? 'bg-[#fbeccb] text-[#8a5a00]'
              : 'bg-[#e7f2d6] text-[#3f6b1f]'
          }`}
        >
          {hasAnyDetected ? (
            <>
              <AlertTriangle className="size-3.5" />
              Requiere atención
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5" />
              Sin señales críticas
            </>
          )}
        </span>
      </div>

      <h2 className="font-display mt-2 text-lg font-semibold tracking-tight text-[#1f1e1a]">
        Señales de estancamiento, adherencia y desbalance
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Señal 1: Estancamiento */}
        <div className="surface-muted rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#77756d]">
                Estancamiento de carga
              </span>
            </div>

            <div className="mt-2.5 space-y-2">
              {estancamiento.length === 0 ? (
                <p className="text-sm text-[#77756d]">
                  Sin registros suficientes en los ejercicios evaluados.
                </p>
              ) : (
                estancamiento.map((senal, index) => {
                  const subject = senal.sobre ?? senal.detalle?.exerciseId ?? `Ejercicio ${index + 1}`;
                  if (senal.estado === 'DETECTADA' && senal.detalle) {
                    return (
                      <div
                        key={subject}
                        className="rounded-lg border border-[#fbe1dc] bg-[#fff5f4] p-2.5 text-xs text-[#9b2c1f]"
                      >
                        <p className="font-semibold text-sm">
                          {humanizeEnum(subject)}
                        </p>
                        <p className="mt-1">
                          Variación: {senal.detalle.variacionPorcentual}% en{' '}
                          {senal.detalle.sesionesConsideradas} sesiones consideradas (umbral +2,5%).
                        </p>
                      </div>
                    );
                  }
                  if (senal.estado === 'SIN_SENAL') {
                    return (
                      <div
                        key={subject}
                        className="flex items-center gap-1.5 text-xs text-[#3f6b1f]"
                      >
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        <span>{humanizeEnum(subject)}: progresión normal</span>
                      </div>
                    );
                  }
                  return (
                    <div key={subject} className="mt-1">
                      <InsufficientInfo
                        missing={senal.missing ?? 'sesiones del ejercicio'}
                        required={senal.required}
                        available={senal.available}
                        unit={senal.unit}
                        action={senal.action}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Señal 2: Caída de adherencia */}
        <div className="surface-muted rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#77756d]">
                Caída de adherencia
              </span>
            </div>

            <div className="mt-2.5">
              {caidaDeAdherencia.estado === 'DETECTADA' && caidaDeAdherencia.detalle ? (
                <div className="rounded-lg border border-[#fbeccb] bg-[#fffcf5] p-2.5 text-xs text-[#8a5a00]">
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    <TrendingDown className="size-4" />
                    <span>Caída de {caidaDeAdherencia.detalle.caidaEnPuntos} puntos</span>
                  </div>
                  <p className="mt-1 text-xs">
                    Pasó del {caidaDeAdherencia.detalle.adherenciaPrevia}% previo al{' '}
                    {caidaDeAdherencia.detalle.adherenciaReciente}% reciente (umbral ≥ 25 pts).
                  </p>
                </div>
              ) : caidaDeAdherencia.estado === 'SIN_SENAL' ? (
                <div className="flex items-start gap-1.5 text-xs text-[#3f6b1f]">
                  <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />
                  <span>
                    {caidaDeAdherencia.sobre?.includes('adherencia nula sostenida')
                      ? 'Adherencia nula sostenida sin variación de caída.'
                      : 'Adherencia estable sin caídas significativas.'}
                  </span>
                </div>
              ) : (
                <InsufficientInfo
                  missing={caidaDeAdherencia.missing ?? 'frecuencia objetivo vigente'}
                  required={caidaDeAdherencia.required}
                  available={caidaDeAdherencia.available}
                  unit={caidaDeAdherencia.unit}
                  action={caidaDeAdherencia.action}
                />
              )}
            </div>
          </div>
        </div>

        {/* Señal 3: Desbalance muscular */}
        <div className="surface-muted rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#77756d]">
                Balance muscular
              </span>
            </div>

            <div className="mt-2.5 space-y-2">
              {desbalance.estado === 'DETECTADA' && desbalance.detalle ? (
                <div className="space-y-1.5">
                  {desbalance.detalle.map((item) => (
                    <div
                      key={item.grupo}
                      className="rounded-lg border border-[#fbeccb] bg-[#fffcf5] p-2 text-xs text-[#8a5a00]"
                    >
                      <span className="font-semibold">{humanizeEnum(item.grupo)}</span>:{' '}
                      {item.seriesSemanales} series/sem (
                      {item.tipo === 'POR_DEFECTO'
                        ? 'por defecto, mín. 6'
                        : 'por exceso, máx. 22'}
                      )
                    </div>
                  ))}
                </div>
              ) : desbalance.estado === 'SIN_SENAL' ? (
                <div className="flex items-start gap-1.5 text-xs text-[#3f6b1f]">
                  <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />
                  <span>Volumen muscular equilibrado (entre 6 y 22 series semanales por grupo).</span>
                </div>
              ) : (
                <InsufficientInfo
                  missing={desbalance.missing ?? 'datos musculares'}
                  required={desbalance.required}
                  available={desbalance.available}
                  unit={desbalance.unit}
                  action={desbalance.action}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {seriesSinClasificar > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#fbeccb] bg-[#fffcf5] p-3 text-xs text-[#8a5a00]">
          <AlertCircle className="size-4 shrink-0" />
          <span>
            Atención: El alumno ejecutó <strong>{seriesSinClasificar}</strong> series de ejercicios
            sin clasificación muscular asignada en el catálogo (RN-30).
          </span>
        </div>
      )}
    </BentoCard>
  );
}
