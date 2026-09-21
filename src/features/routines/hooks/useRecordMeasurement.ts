import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  recordMeasurement,
  type RecordMeasurementInput,
} from '../../../api/measurements';
import { activeRoutineQueryKey } from './useActiveRoutine';

/**
 * Carga de peso y altura desde el aviso de renovación (HU02-T1).
 *
 * Al registrarse se invalida la rutina vigente: el aviso de renovación depende
 * de si hay medición nueva en el ciclo, de modo que la vista tiene que volver a
 * consultarlo en lugar de quedarse con el estado anterior.
 */
export function useRecordMeasurement(studentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecordMeasurementInput) =>
      recordMeasurement(studentId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: activeRoutineQueryKey });
    },
  });
}
