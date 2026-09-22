import { useMutation } from '@tanstack/react-query';

import {
  requestRoutineGeneration,
  type RequestRoutineGenerationInput,
} from '../../../api/routineGenerations';

export function useRequestRoutineGeneration(studentId: string) {
  return useMutation({
    mutationFn: (input: RequestRoutineGenerationInput) =>
      requestRoutineGeneration(studentId, input),
  });
}
