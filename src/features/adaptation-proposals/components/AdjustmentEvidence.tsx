import { formatDate, humanizeEnum } from '../../../shared/lib/format';

type AdjustmentType =
  'CARGA' | 'VOLUMEN' | 'ESQUEMA' | 'SUSTITUCION' | 'ESTRUCTURA';

const HIDDEN_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'token_hash',
  'email',
  'display_name',
  'id',
  'goalid',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2');
  return humanizeEnum(spaced);
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') return value.toLocaleString('es-AR');
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        return formatDate(value);
      } catch {
        return value;
      }
    }
    if (value.includes('_') && /^[A-Z_]+$/.test(value))
      return humanizeEnum(value);
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Dato sustentante legible para un ajuste (T3 · RN-84, RF-090, RN-73).
 * Muestra criterio y dato sin inventar: lo ausente se declara, no se oculta.
 */
export function AdjustmentEvidence({
  type,
  criterion,
  supportingData,
}: {
  type: AdjustmentType;
  criterion: string;
  supportingData: unknown;
}) {
  return (
    <div className="mt-1">
      <p className="text-[11px] text-[#77756d]">
        <span className="font-bold text-[#3d3c36]">Criterio: </span>
        {criterion}
      </p>
      <SupportingDataList supportingData={supportingData} type={type} />
    </div>
  );
}

function SupportingDataList({
  supportingData,
  type,
}: {
  supportingData: unknown;
  type: AdjustmentType;
}) {
  if (!isRecord(supportingData)) {
    return (
      <p className="mt-1 text-[11px] text-[#77756d]">
        Dato: sin datos adicionales declarados.
      </p>
    );
  }
  const entries = Object.entries(supportingData).filter(
    ([key]) => !HIDDEN_KEYS.has(key.toLowerCase()),
  );
  if (entries.length === 0) {
    return (
      <p className="mt-1 text-[11px] text-[#77756d]">
        Dato: sin datos adicionales declarados.
      </p>
    );
  }

  if (type === 'ESTRUCTURA') {
    return <StructureEvidence data={supportingData} />;
  }

  return (
    <dl className="mt-1 space-y-0.5 text-[11px] text-[#77756d]">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-1">
          <dt className="font-bold text-[#3d3c36]">{humanizeKey(key)}:</dt>
          <dd className="min-w-0 flex-1 break-words">
            {renderEvidenceValue(key, value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function renderEvidenceValue(key: string, value: unknown): string {
  if (key === 'esquemaPropuesto' && isRecord(value)) {
    const parts: string[] = [];
    const get = (k: string) => value[k];
    if (
      typeof get('minSets') === 'number' &&
      typeof get('maxSets') === 'number'
    ) {
      parts.push(`series ${get('minSets')}–${get('maxSets')}`);
    }
    if (
      typeof get('minRepetitions') === 'number' &&
      typeof get('maxRepetitions') === 'number'
    ) {
      parts.push(`reps ${get('minRepetitions')}–${get('maxRepetitions')}`);
    }
    if (typeof get('restSeconds') === 'number') {
      parts.push(`descanso ${get('restSeconds')}s`);
    }
    return parts.length > 0 ? parts.join(' · ') : formatPrimitive(value);
  }
  if (key === 'mediciones' && Array.isArray(value)) {
    if (value.length === 0) return 'Sin medición en el ciclo';
    return value
      .map((m) => {
        if (!isRecord(m)) return formatPrimitive(m);
        const t = typeof m['type'] === 'string' ? humanizeEnum(m['type']) : '';
        const v =
          typeof m['value'] === 'number'
            ? m['value'].toLocaleString('es-AR')
            : formatPrimitive(m['value']);
        const f =
          typeof m['measuredOn'] === 'string'
            ? formatDate(m['measuredOn'])
            : '';
        return `${t} ${v} · ${f}`.trim();
      })
      .join('; ');
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((item) => formatPrimitive(item)).join('; ');
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([k, v]) => `${humanizeKey(k)} ${formatPrimitive(v)}`)
      .join(' · ');
  }
  return formatPrimitive(value);
}

function StructureEvidence({ data }: { data: Record<string, unknown> }) {
  const motivo = typeof data['motivo'] === 'string' ? data['motivo'] : null;
  const objetivoAnterior = data['objetivoAnterior'];
  const objetivoNuevo = data['objetivoNuevo'];
  const tipoVigente = data['tipoRutinaVigente'] ?? data['routine_type'];
  const tipoPropuesto = data['tipoRutinaPropuesto'] ?? data['routine_type'];
  const ejercicios = data['ejerciciosAfectados'];
  const sinDatos = data['sinDatosActualizados'];
  const faltas = data['faltasConsecutivas'];
  const datoFaltante = data['datoFaltante'];
  const mediciones = data['mediciones'];
  const esquema = data['esquemaPropuesto'];

  return (
    <dl className="mt-1 space-y-0.5 text-[11px] text-[#77756d]">
      {motivo ? (
        <div className="flex gap-1">
          <dt className="font-bold text-[#3d3c36]">Motivo:</dt>
          <dd>{humanizeEnum(motivo)}</dd>
        </div>
      ) : null}
      {objetivoAnterior !== undefined || objetivoNuevo !== undefined ? (
        <div className="flex gap-1">
          <dt className="font-bold text-[#3d3c36]">Objetivo:</dt>
          <dd>
            {formatPrimitive(objetivoAnterior)} →{' '}
            {formatPrimitive(objetivoNuevo)}
          </dd>
        </div>
      ) : null}
      {tipoVigente !== undefined || tipoPropuesto !== undefined ? (
        <div className="flex gap-1">
          <dt className="font-bold text-[#3d3c36]">Tipo:</dt>
          <dd>
            {formatPrimitive(tipoVigente)} → {formatPrimitive(tipoPropuesto)}
          </dd>
        </div>
      ) : null}
      {esquema !== undefined && isRecord(esquema) ? (
        <div className="flex gap-1">
          <dt className="font-bold text-[#3d3c36]">Esquema:</dt>
          <dd>{renderEvidenceValue('esquemaPropuesto', esquema)}</dd>
        </div>
      ) : null}
      {ejercicios !== undefined ? (
        <div className="flex gap-1">
          <dt className="font-bold text-[#3d3c36]">Ejercicios afectados:</dt>
          <dd>{formatPrimitive(ejercicios)}</dd>
        </div>
      ) : null}
      {sinDatos !== undefined ? (
        <div className="flex gap-1">
          <dt className="font-bold text-[#3d3c36]">Datos actualizados:</dt>
          <dd>
            {sinDatos === true ? 'No' : 'Sí'}
            {typeof faltas === 'number'
              ? ` · faltas consecutivas: ${faltas}`
              : ''}
            {typeof datoFaltante === 'string'
              ? ` · falta: ${datoFaltante}`
              : ''}
          </dd>
        </div>
      ) : null}
      {mediciones !== undefined ? (
        <div className="flex gap-1">
          <dt className="font-bold text-[#3d3c36]">Mediciones:</dt>
          <dd>{renderEvidenceValue('mediciones', mediciones)}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/**
 * Resumen de una línea para la bandeja (T2): primer criterio + dato clave,
 * sin abrir el detalle. Si no hay ajustes, lo declara (RN-73).
 */
export function adjustmentEvidenceSummary(adjustment: {
  type: AdjustmentType;
  exerciseName: string | null;
  criterion: string;
  supportingData: unknown;
}): string {
  const where = adjustment.exerciseName ?? 'Rutina completa';
  const base = `${where}: ${adjustment.criterion}`;
  if (!isRecord(adjustment.supportingData)) return base;
  const data = adjustment.supportingData;
  if (typeof data['objetivoNuevo'] === 'string') {
    return `${base} (→ ${humanizeEnum(data['objetivoNuevo'])})`;
  }
  if (typeof data['datoFaltante'] === 'string') {
    return `${base} (falta: ${data['datoFaltante']})`;
  }
  if (typeof data['motivo'] === 'string' && adjustment.type !== 'ESTRUCTURA') {
    return `${base} (${humanizeEnum(data['motivo'])})`;
  }
  // Fallback genérico (T2): muestra la primera evidencia numérica/textual para
  // que la bandeja también exponga el dato en CARGA/VOLUMEN/ESQUEMA/SUSTITUCION.
  for (const [key, value] of Object.entries(data)) {
    if (key.toLowerCase() === 'goalid' || key.toLowerCase() === 'id') continue;
    if (typeof value === 'number') {
      return `${base} (${humanizeKey(key)}: ${value.toLocaleString('es-AR')})`;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const short =
        value.trim().length > 60
          ? `${value.trim().slice(0, 60)}…`
          : value.trim();
      return `${base} (${humanizeKey(key)}: ${short})`;
    }
    if (typeof value === 'boolean') {
      return `${base} (${humanizeKey(key)}: ${value ? 'sí' : 'no'})`;
    }
  }
  return base;
}
