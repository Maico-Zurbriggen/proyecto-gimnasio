import { useMutation, useQueryClient } from '@tanstack/react-query';

import { finalizeRoutineGeneration } from '../../../api/routineGenerations';
import { studentQueryKey } from '../../students/hooks/useStudentStatus';
import { routineGenerationQueryKey } from './useRoutineGeneration';

export function useFinalizeRoutineGeneration(
  studentId: string,
  requestId?: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => finalizeRoutineGeneration(studentId, requestId ?? ''),
    onSuccess: async (result) => {
      queryClient.setQueryData(
        routineGenerationQueryKey(studentId, requestId ?? ''),
        (snapshot: object | undefined) =>
          snapshot ? { ...snapshot, routineId: result.routineId } : snapshot,
      );
      await queryClient.invalidateQueries({
        queryKey: studentQueryKey(studentId),
      });
    },
  });
}
