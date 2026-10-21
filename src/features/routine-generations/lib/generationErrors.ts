import { ApiError } from '../../../api/client';

export function requestErrorMessage(
  error: unknown,
  esEntrenador = false,
): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos solicitar la rutina. Probá de nuevo.';
  }

  switch (error.code) {
    case 'generation_preferences_unsatisfiable': {
      const body = error.body;
      const violations =
        body &&
        typeof body === 'object' &&
        'violations' in body &&
        Array.isArray(body.violations)
          ? body.violations.filter(
              (value): value is string => typeof value === 'string',
            )
          : [];
      return violations.length
        ? violations.join(' ')
        : 'El pedido no se puede cumplir con los ejercicios compatibles disponibles. Reformulá las indicaciones.';
    }
    case 'empty_prefiltered_catalog':
    case 'empty_gym_catalog':
      return 'El administrador debe habilitar ejercicios del gimnasio antes de generar una rutina.';
    case 'generation_context_changed':
      return 'Cambió tu perfil, el inventario o un ejercicio seleccionado. Iniciá una nueva solicitud.';
    case 'generation_unable':
      return error.body &&
        typeof error.body === 'object' &&
        'reason' in error.body &&
        typeof error.body.reason === 'string'
        ? error.body.reason
        : 'La IA no pudo proponer una rutina con la información disponible.';
    case 'student_not_found':
      return esEntrenador
        ? 'El perfil del alumno ya no está disponible.'
        : 'Tu perfil de alumno ya no está disponible.';
    case 'forbidden_not_assigned':
    case 'forbidden_role':
      return 'No tenés permiso para generar esta rutina.';
    case 'ai_service_unavailable':
      return 'La generación está temporalmente no disponible. El resto de la ficha sigue funcionando.';
    case 'no_proposed_routine':
      return 'Ya no hay una rutina propuesta para modificar.';
    case 'missing_generation_input':
      return 'Escribí al menos una indicación para la nueva rutina.';
    case 'proposed_routine_already_exists':
      return esEntrenador
        ? 'El alumno ya tiene una rutina propuesta pendiente de revisión.'
        : 'Ya tenés una rutina propuesta pendiente de revisión.';
    case 'routine_regeneration_not_allowed':
      return 'La regeneración de prueba sólo está habilitada en el entorno local.';
    case 'invalid_generated_routine':
      return 'La salida no superó las validaciones de seguridad del backend.';
    case 'routine_generation_not_completed':
      return 'La generación todavía no terminó. Reintentá en unos segundos.';
    case 'routine_generation_idempotency_conflict':
      return 'La clave de esta solicitud ya se usó con otras indicaciones. Iniciá una solicitud nueva.';
    default:
      return 'No pudimos solicitar la rutina. Probá de nuevo.';
  }
}

type ChangeRequestSnapshot = {
  status?: string;
  reason?: string | null;
  error?: string | null;
  violaciones?: string[] | null;
};

/**
 * Mensaje del pedido de cambios (HITL) a partir del polling.
 * Antes solo leía `reason` (solo existe en UNABLE) e ignoraba `error`,
 * por eso un fallo técnico mostraba siempre el genérico
 * "La IA no pudo cumplir el pedido".
 */
export function changeRequestStatusMessage(
  snapshot: ChangeRequestSnapshot | undefined | null,
): string {
  if (!snapshot) {
    return 'La IA no pudo cumplir el pedido. Reformulalo y probá de nuevo.';
  }
  if (snapshot.violaciones && snapshot.violaciones.length > 0) {
    return 'El pedido no superó las validaciones. Reformulalo y probá de nuevo.';
  }
  if (snapshot.reason) return snapshot.reason;
  switch (snapshot.error) {
    case 'invalid_generated_routine':
      return 'La salida no superó las validaciones de seguridad del backend.';
    case 'generation_unable':
      return 'La IA no pudo proponer una rutina con la información disponible.';
    case 'llm_timeout':
    case 'AGOTADO_POR_TIEMPO':
    case 'llm_request_failed':
    case 'unknown_generation_task':
    case 'worker_interrupted':
    case 'context_capacity_exceeded':
      return 'La generación está temporalmente no disponible. La propuesta actual sigue vigente; podés seguir con una plantilla manual del entrenador.';
    default:
      return snapshot.error
        ? 'No se pudo completar el pedido (' +
            snapshot.error +
            '). Probá de nuevo.'
        : 'La IA no pudo cumplir el pedido. Reformulalo y probá de nuevo.';
  }
}
