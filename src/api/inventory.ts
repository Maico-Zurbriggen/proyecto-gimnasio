import { z } from 'zod';

import { apiGet, apiPut } from './client';

/**
 * Inventario del gimnasio (FL-20) y primeros pasos del administrador (CB-59).
 * Escrito a mano hasta que el backend publique el cliente generado.
 */
export const inventorySchema = z.object({
  equipment: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      present: z.boolean(),
      alwaysPresent: z.boolean(),
    }),
  ),
  prescribableExercises: z.number().int(),
  totalExercises: z.number().int(),
  missingPatterns: z.array(z.string()),
  onlyBodyweight: z.boolean(),
});

export const savedInventorySchema = inventorySchema.extend({
  markedIncompatible: z.number().int(),
  restored: z.number().int(),
});

export const gymSetupSchema = z.object({
  hasTrainer: z.boolean(),
  hasInventory: z.boolean(),
  ready: z.boolean(),
});

export type Inventory = z.infer<typeof inventorySchema>;
export type SavedInventory = z.infer<typeof savedInventorySchema>;
export type GymSetup = z.infer<typeof gymSetupSchema>;

export const inventoryQueryKey = ['admin', 'inventory'] as const;
export const gymSetupQueryKey = ['admin', 'setup'] as const;

export async function fetchInventory(signal?: AbortSignal): Promise<Inventory> {
  return inventorySchema.parse(await apiGet('/admin/inventory', { signal }));
}

export async function saveInventory(
  present: string[],
): Promise<SavedInventory> {
  return savedInventorySchema.parse(
    await apiPut('/admin/inventory', { present }),
  );
}

export async function fetchGymSetup(signal?: AbortSignal): Promise<GymSetup> {
  return gymSetupSchema.parse(await apiGet('/admin/setup', { signal }));
}
