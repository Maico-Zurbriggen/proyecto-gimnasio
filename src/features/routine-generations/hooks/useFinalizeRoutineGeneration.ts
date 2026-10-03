import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../../../api/client';
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
    onError: async (error) => {
      if (
        error instanceof ApiError &&
        error.code === 'proposed_routine_already_exists'
      ) {
        await queryClient.invalidateQueries({
          queryKey: studentQueryKey(studentId),
        });
      }
    },
  });
}
