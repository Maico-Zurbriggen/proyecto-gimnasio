import { useQuery } from '@tanstack/react-query';

import { fetchSetPreload } from '../../../api/trainingSessions';

export function setPreloadQueryKey(
  studentId: string,
  routineDayId: string,
): readonly string[] {
  return ['training-sessions', 'set-preload', studentId, routineDayId] as const;
}

/**
 * Valores con los que se presenta cada serie del día (HU22 - T2, RF-030).
 *
 * Se consulta una vez al abrir la sesión y no se refresca por su cuenta: una
 * vez que el alumno empezó a corregir valores, cambiárselos debajo sería peor
 * que mostrarle un dato unos minutos viejo. La antigüedad del dato viaja en la
 * respuesta (DD-15), así que la pantalla puede declararla.
 */
export function useSetPreload(studentId: string, routineDayId: string) {
  return useQuery({
    queryKey: setPreloadQueryKey(studentId, routineDayId),
    queryFn: ({ signal }) => fetchSetPreload(studentId, routineDayId, signal),
    enabled: studentId.length > 0 && routineDayId.length > 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
