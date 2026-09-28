import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unlockStudent } from '../../../api/students';
import { studentQueryKey } from './useStudentStatus';
import { trainerStudentsQueryKey } from './useTrainerStudents';

/** Aprobación de la regularización ya presentada por el alumno. */
export function useUnlockStudent(studentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => unlockStudent(studentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: studentQueryKey(studentId),
        }),
        queryClient.invalidateQueries({ queryKey: trainerStudentsQueryKey }),
      ]);
    },
  });
}
