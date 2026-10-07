import createClient from 'openapi-fetch';
import type { components, paths, operations } from './generated/catalog';
import { ApiError } from './client';

const baseUrl = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000'
).replace(/\/+$/, '');
const client = createClient<paths>({
  baseUrl,
  credentials: 'include',
  fetch: (request) => globalThis.fetch(request),
});
export type CatalogExercise = components['schemas']['CatalogExercise'];
export type ExerciseInput = components['schemas']['ExerciseInput'];
export type Taxonomies = components['schemas']['Taxonomies'];
export type CatalogQuery =
  operations['listCatalogExercises']['parameters']['query'];
export type AvailabilityChange =
  components['schemas']['AvailabilityInput']['changes'][number];
function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  if (!result.response.ok || result.data === undefined) {
    const code =
      result.error &&
      typeof result.error === 'object' &&
      'error' in result.error &&
      typeof result.error.error === 'string'
        ? result.error.error
        : 'unknown_error';
    throw new ApiError(result.response.status, code, result.error);
  }
  return result.data;
}
export const listCatalog = async (query: CatalogQuery, signal?: AbortSignal) =>
  unwrap(await client.GET('/catalog/exercises', { params: { query }, signal }));
export const getTaxonomies = async (signal?: AbortSignal) =>
  unwrap(await client.GET('/catalog/taxonomies', { signal }));
export const getExercise = async (exerciseId: string, signal?: AbortSignal) =>
  unwrap(
    await client.GET('/catalog/exercises/{exerciseId}', {
      params: { path: { exerciseId } },
      signal,
    }),
  );
export const getInventory = async (signal?: AbortSignal) =>
  unwrap(await client.GET('/catalog/inventory', { signal }));
export const setInventory = async (
  body: components['schemas']['InventoryInput'],
) => unwrap(await client.POST('/catalog/inventory', { body }));
export const setAvailability = async (changes: AvailabilityChange[]) =>
  unwrap(await client.POST('/catalog/availability', { body: { changes } }));
export const createExercise = async (body: ExerciseInput) =>
  unwrap(await client.POST('/catalog/exercises', { body }));
export const updateExercise = async (
  exerciseId: string,
  body: components['schemas']['UpdateExercise'],
) =>
  unwrap(
    await client.PATCH('/catalog/exercises/{exerciseId}', {
      params: { path: { exerciseId } },
      body,
    }),
  );
export const reviewExercise = async (
  exerciseId: string,
  body: components['schemas']['ReviewExercise'],
) =>
  unwrap(
    await client.POST('/catalog/exercises/{exerciseId}/review', {
      params: { path: { exerciseId } },
      body,
    }),
  );
export const catalogMediaUrl = (url: string) =>
  url.startsWith('/catalog/media/') ? `${baseUrl}${url}` : url;

export function catalogError(error: unknown): string {
  if (!(error instanceof ApiError))
    return 'No pudimos conectar. Intentá nuevamente.';
  const messages: Record<string, string> = {
    availability_conflict:
      'La disponibilidad cambió. Recargá el catálogo y revisá tu selección.',
    catalog_revision_conflict:
      'La ficha cambió. Recargá el catálogo antes de editar o revisar.',
    inventory_conflict: 'El inventario cambió. Recargá antes de guardar.',
    exercise_not_approved: 'Sólo se pueden habilitar ejercicios aprobados.',
    exercise_name_exists: 'Ya existe un ejercicio propio con ese nombre.',
    approved_exercise_requires_retirement:
      'El administrador debe retirar este ejercicio antes de editarlo.',
    invalid_catalog_taxonomy:
      'La clasificación incluye una opción que ya no existe.',
    invalid_request_body: 'Revisá los campos y las selecciones de la ficha.',
    invalid_catalog_request: 'Revisá los campos y las selecciones de la ficha.',
    forbidden: 'Tu rol no permite esta acción.',
  };
  return (
    messages[error.code] ??
    'No se pudo completar la acción. Recargá e intentá nuevamente.'
  );
}
