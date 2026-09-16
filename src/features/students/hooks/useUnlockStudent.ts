import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unlockStudent, type UnlockStudentInput } from '../../../api/students';
import { studentQueryKey } from './useStudentStatus';
import { trainerStudentsQueryKey } from './useTrainerStudents';

/** Desbloqueo del alumno con la medición adeudada (HU05-T1). */
export function useUnlockStudent(studentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UnlockStudentInput) => unlockStudent(studentId, input),
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
