import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  activateRoutineTemplate,
  createRoutineTemplate,
  deactivateRoutineTemplate,
  fetchRoutineTemplate,
  fetchRoutineTemplates,
  routineTemplateQueryKey,
  routineTemplatesQueryKey,
  updateRoutineTemplate,
  type WriteTemplate,
} from '../../../api/prescriptions';

/** Plantillas activas del gimnasio, para gestionar y para asignar. */
export function useManagedRoutineTemplates() {
  return useQuery({
    queryKey: routineTemplatesQueryKey(),
    queryFn: ({ signal }) => fetchRoutineTemplates(signal),
    staleTime: 5 * 60 * 1000,
  });
}

/** Detalle editable de una plantilla. Sólo se pide al editar. */
export function useManagedRoutineTemplate(templateId: string | null) {
  return useQuery({
    queryKey: routineTemplateQueryKey(templateId ?? ''),
    queryFn: ({ signal }) => fetchRoutineTemplate(templateId ?? '', signal),
    enabled: Boolean(templateId),
  });
}

function useInvalidateTemplates() {
  const queryClient = useQueryClient();
  return async (templateId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: routineTemplatesQueryKey() }),
      ...(templateId
        ? [
            queryClient.invalidateQueries({
              queryKey: routineTemplateQueryKey(templateId),
            }),
          ]
        : []),
    ]);
  };
}

/** Crea una plantilla privada del gimnasio (RF-019). */
export function useCreateRoutineTemplate() {
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: (input: WriteTemplate) => createRoutineTemplate(input),
    onSuccess: () => invalidate(),
  });
}

/** Reemplaza el contenido de una plantilla activa. */
export function useUpdateRoutineTemplate(templateId: string) {
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: (input: WriteTemplate) =>
      updateRoutineTemplate(templateId, input),
    onSuccess: () => invalidate(templateId),
  });
}

/** Desactiva o reactiva una plantilla del gimnasio, sin borrarla. */
export function useSetRoutineTemplateActive() {
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: (input: { templateId: string; active: boolean }) =>
      input.active
        ? activateRoutineTemplate(input.templateId)
        : deactivateRoutineTemplate(input.templateId),
    onSuccess: (_data, input) => invalidate(input.templateId),
  });
}
