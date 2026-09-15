import { useCallback, useEffect, useMemo, useState } from 'react';

import { toDateKey } from '../../../shared/lib/date';
import {
  calcularEstadoAvisoRenovacion,
  esDescartable,
} from '../lib/renewalNotice';
import type { DiasRestantesRenovacion } from '../types';

function dismissKey(studentId: string, today: Date): string {
  return `renovacion-aviso-descartado:${studentId}:${toDateKey(today)}`;
}

function readDismissed(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    // localStorage puede no estar disponible (modo privado, SSR, etc.).
    return false;
  }
}

export interface UseRenewalNoticeOptions {
  studentId: string;
  diasRestantesRenovacion: DiasRestantesRenovacion;
  /** Inyectable para pruebas; por defecto es la fecha actual. */
  today?: Date;
}

/**
 * Estado del aviso de renovación (HU01-T4/T5). El descarte se guarda por
 * alumno y por día calendario: al cambiar el día, la clave de storage
 * cambia y el aviso vuelve a aparecer automáticamente si el ciclo sigue
 * sin renovarse (escenario 2.1).
 */
export function useRenewalNotice({
  studentId,
  diasRestantesRenovacion,
  today = new Date(),
}: UseRenewalNoticeOptions) {
  const estado = useMemo(
    () => calcularEstadoAvisoRenovacion(diasRestantesRenovacion),
    [diasRestantesRenovacion],
  );

  const todayTime = today.getTime();
  const key = useMemo(
    () => dismissKey(studentId, today),
    [studentId, todayTime],
  );
  const [dismissed, setDismissed] = useState(() => readDismissed(key));

  // Si cambia el día calendario (nueva clave), releer el descarte: permite
  // que el aviso reaparezca al día siguiente sin recargar la página.
  useEffect(() => {
    setDismissed(readDismissed(key));
  }, [key]);

  const dismiss = useCallback(() => {
    if (!esDescartable(estado)) {
      return;
    }
    try {
      window.localStorage.setItem(key, '1');
    } catch {
      // Si no se puede persistir, el aviso igual se oculta para esta sesión.
    }
    setDismissed(true);
  }, [estado, key]);

  const visible = estado !== 'OCULTO' && !(dismissed && esDescartable(estado));

  return { estado, visible, dismissible: esDescartable(estado), dismiss };
}
