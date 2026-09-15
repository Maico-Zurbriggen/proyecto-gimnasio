import { useState } from 'react';

import type { BodyMeasurementInput } from '../../../shared/schemas/bodyMeasurement';
import { BlockedStudentBanner } from './BlockedStudentBanner';
import { PendingMeasurementsForm } from './PendingMeasurementsForm';
import type { BlockedStudentInfo } from '../types';

export interface UnlockPanelProps {
  student: BlockedStudentInfo;
  /** Confirma el desbloqueo; la operación atómica real es de otra tarea (HU05-T1). */
  onUnlock: (measurement: BodyMeasurementInput) => void;
}

/**
 * Flujo de desbloqueo en la ficha del entrenador (HU05-T2/T3/T4): muestra el
 * motivo de bloqueo, embebe la carga de las métricas adeudadas y habilita el
 * botón de desbloqueo recién cuando el formulario es válido.
 */
export function UnlockPanel({ student, onUnlock }: UnlockPanelProps) {
  const [measurement, setMeasurement] = useState<BodyMeasurementInput | null>(
    null,
  );

  if (!student.bloqueado) {
    return null;
  }

  const canUnlock = measurement !== null;

  return (
    <div className="bento-card flex flex-col gap-5">
      <BlockedStudentBanner student={student} />

      <div>
        <p className="eyebrow mb-3 text-[#77756d]">Métricas adeudadas</p>
        <PendingMeasurementsForm
          onValidityChange={(valid, values) =>
            setMeasurement(valid ? values : null)
          }
        />
      </div>

      <button
        type="button"
        disabled={!canUnlock}
        onClick={() => {
          if (measurement) {
            onUnlock(measurement);
          }
        }}
        className="self-start rounded-full bg-lime px-4 py-2.5 text-xs font-bold text-graphite transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#e4e2d8] disabled:text-[#9a988e] disabled:hover:brightness-100"
      >
        Desbloquear alumno
      </button>
    </div>
  );
}
