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
