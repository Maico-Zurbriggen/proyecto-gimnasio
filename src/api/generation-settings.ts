import { apiGet, apiPut } from './client';
import { generationSettingsSnapshotSchema } from './generated/generation-management';
export type {
  GenerationSettings,
  GenerationSettingsSnapshot,
} from './generated/generation-management';
import type { GenerationSettingsSnapshot } from './generated/generation-management';

export async function fetchGenerationSettings(signal?: AbortSignal) {
  return generationSettingsSnapshotSchema.parse(
    await apiGet('/gyms/me/generation-settings', { signal }),
  );
}
export async function saveGenerationSettings(
  input: GenerationSettingsSnapshot,
) {
  return generationSettingsSnapshotSchema.parse(
    await apiPut('/gyms/me/generation-settings', input),
  );
}
