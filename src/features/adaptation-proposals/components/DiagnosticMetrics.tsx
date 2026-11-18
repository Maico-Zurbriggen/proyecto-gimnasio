import { humanizeEnum } from '../../../shared/lib/format';

export const DIAGNOSTIC_METRIC_KEYS = new Set([
  'sesionesConsideradas',
  'variacionCargaMaxima',
  'variacionE1RM',
  'cumplimientoRepeticionesPorSesion',
  'esfuerzoMedioPorSesion',
  'criteriosNoEvaluados',
]);

const numberFormat = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
});
const changeFormat = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});
const missingCriterion: Record<string, string> = {
  esfuerzo_percibido_no_registrado: 'Esfuerzo percibido sin registrar',
  variacion_carga_maxima_no_calculable:
    'Variación de carga máxima estimada no calculable',
  adherencia_no_disponible: 'Adherencia no disponible',
};

export function hasDiagnosticMetrics(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => DIAGNOSTIC_METRIC_KEYS.has(key));
}

function numeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function series(value: unknown): (number | null)[] | null {
  return Array.isArray(value) ? value.map(numeric) : null;
}

function average(values: (number | null)[]): number | null {
  const recorded = values.filter((value): value is number => value !== null);
  return recorded.length > 0
    ? recorded.reduce((sum, value) => sum + value, 0) / recorded.length
    : null;
}

/** Presents recorded metrics and their averages; missing values never become zero. */
export function DiagnosticMetrics({
  metrics,
}: {
  metrics: Record<string, unknown>;
}) {
  const compliance = series(metrics.cumplimientoRepeticionesPorSesion);
  const effort = series(metrics.esfuerzoMedioPorSesion);
  const count = numeric(metrics.sesionesConsideradas);
  const variation = numeric(
    metrics.variacionCargaMaxima ?? metrics.variacionE1RM,
  );
  const rowCount = Math.max(
    count ?? 0,
    compliance?.length ?? 0,
    effort?.length ?? 0,
  );
  const cards: { label: string; value: string }[] = [];
  if ('sesionesConsideradas' in metrics) {
    cards.push({
      label: 'Sesiones consideradas',
      value: count === null ? 'Sin registrar' : numberFormat.format(count),
    });
  }
  if ('variacionCargaMaxima' in metrics || 'variacionE1RM' in metrics) {
    cards.push({
      label: 'Variación de carga máxima estimada',
      value:
        variation === null
          ? 'Sin datos comparables'
          : `${changeFormat.format(variation)} %`,
    });
  }
  if (compliance) {
    const mean = average(compliance);
    cards.push({
      label: 'Cumplimiento promedio',
      value: mean === null ? 'Sin registrar' : `${numberFormat.format(mean)} %`,
    });
  }
  if (effort) {
    const mean = average(effort);
    cards.push({
      label: 'Esfuerzo promedio',
      value:
        mean === null ? 'Sin registrar' : `${numberFormat.format(mean)} / 10`,
    });
  }
  const criteria = Array.isArray(metrics.criteriosNoEvaluados)
    ? metrics.criteriosNoEvaluados.filter(
        (value): value is string => typeof value === 'string',
      )
    : null;

  return (
    <div className="mt-3 rounded-xl border border-[#292823]/10 bg-[#f7f7f2] p-3">
      <p className="text-xs font-semibold text-[#3d3c36]">
        Métricas del período
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        {cards.map(({ label, value }) => (
          <div key={label} className="min-w-0">
            <dt className="text-[11px] leading-4 text-[#77756d]">{label}</dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums text-[#292823]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {(compliance || effort) && rowCount > 0 ? (
        <details
          open={rowCount <= 6}
          className="mt-3 border-t border-[#292823]/10 pt-3"
        >
          <summary className="cursor-pointer text-xs font-semibold text-[#3d3c36]">
            Detalle de {rowCount} sesiones
          </summary>
          <table
            aria-label="Métricas por sesión"
            className="mt-2 w-full text-xs tabular-nums"
          >
            <caption className="caption-bottom pt-2 text-left text-[11px] leading-4 text-[#77756d]">
              De la más antigua a la más reciente. Los promedios usan los
              valores registrados.
            </caption>
            <thead>
              <tr className="border-b border-[#292823]/10 text-[#77756d]">
                <th scope="col" className="py-2 text-left font-medium">
                  Sesión
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Cumplimiento
                </th>
                <th scope="col" className="py-2 pl-2 text-right font-medium">
                  Esfuerzo
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }, (_, index) => (
                <tr
                  key={index}
                  className="border-b border-[#292823]/5 last:border-0"
                >
                  <th
                    scope="row"
                    className="py-2 text-left font-medium text-[#77756d]"
                  >
                    {index + 1}
                  </th>
                  <td className="py-2 text-right text-[#3d3c36]">
                    {compliance?.[index] == null
                      ? 'Sin registrar'
                      : `${numberFormat.format(compliance[index])} %`}
                  </td>
                  <td className="py-2 pl-2 text-right text-[#3d3c36]">
                    {effort?.[index] == null
                      ? 'Sin registrar'
                      : `${numberFormat.format(effort[index])} / 10`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
      {criteria ? (
        <div className="mt-3 border-t border-[#292823]/10 pt-2 text-[11px] leading-4 text-[#77756d]">
          {criteria.length === 0 ? (
            'Criterios no evaluados: ninguno.'
          ) : (
            <>
              <p className="font-semibold text-[#3d3c36]">
                Criterios no evaluados
              </p>
              <ul className="mt-1 list-inside list-disc">
                {criteria.map((criterion) => (
                  <li key={criterion}>
                    {missingCriterion[criterion] ?? humanizeEnum(criterion)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
