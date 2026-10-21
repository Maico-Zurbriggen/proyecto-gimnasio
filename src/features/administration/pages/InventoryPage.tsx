import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  fetchInventory,
  gymSetupQueryKey,
  inventoryQueryKey,
  saveInventory,
  type Inventory,
} from '../../../api/inventory';
import { Banner } from '../../../shared/components/Banner';
import { humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';

/** Nombre legible de los grupos de patrones mínimos (RN-118). */
const PATRONES: Record<string, string> = {
  EMPUJE_HORIZONTAL: 'empuje horizontal',
  TRACCION: 'tracción (horizontal o vertical)',
  DOMINANTE_RODILLA: 'dominante de rodilla',
  DOMINANTE_CADERA: 'dominante de cadera',
};

function Cobertura({ data }: { data: Inventory }) {
  return (
    <div className="flex flex-col gap-3">
      {data.onlyBodyweight ? (
        <Banner variant="warning" title="Inventario vacío">
          <p>
            Sólo se pueden prescribir ejercicios de peso corporal hasta que
            declares el equipamiento del gimnasio.
          </p>
        </Banner>
      ) : null}
      {data.missingPatterns.length > 0 ? (
        <Banner variant="warning" title="Faltan patrones de movimiento">
          <p>
            Con este inventario no se puede armar una rutina completa: no hay
            ejercicios de{' '}
            {data.missingPatterns
              .map((patron) => PATRONES[patron] ?? humanizeEnum(patron))
              .join(', ')}
            .
          </p>
        </Banner>
      ) : null}
      <p className="surface-muted text-sm text-[#68675f]">
        {data.prescribableExercises} de {data.totalExercises} ejercicios del
        catálogo se pueden prescribir con este inventario.
      </p>
    </div>
  );
}

/**
 * Inventario del gimnasio (FL-20, RF-114). El administrador marca el
 * equipamiento que tiene; el peso corporal está siempre disponible (RN-115).
 * Retirar algo marca como incompatibles los ejercicios de rutinas vigentes que
 * lo usan, sin detener ninguna rutina (RN-117).
 */
export function InventoryPage() {
  const queryClient = useQueryClient();
  const inventory = useQuery({
    queryKey: inventoryQueryKey,
    queryFn: ({ signal }) => fetchInventory(signal),
  });
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (inventory.data) {
      setSeleccion(
        new Set(
          inventory.data.equipment
            .filter((item) => item.present && !item.alwaysPresent)
            .map((item) => item.code),
        ),
      );
    }
  }, [inventory.data]);

  const guardar = useMutation({
    mutationFn: () => saveInventory([...seleccion]),
    onSuccess: async (data) => {
      queryClient.setQueryData(inventoryQueryKey, data);
      await queryClient.invalidateQueries({ queryKey: gymSetupQueryKey });
    },
  });

  const alternar = (code: string, marcado: boolean) => {
    setSeleccion((actual) => {
      const nuevo = new Set(actual);
      if (marcado) nuevo.add(code);
      else nuevo.delete(code);
      return nuevo;
    });
  };

  return (
    <div>
      <PageHeader
        kicker="Inventario"
        title="Equipamiento del gimnasio."
        description="Las rutinas sólo usan ejercicios cuyo equipamiento está disponible acá."
      />
      <main className="page-body grid gap-4 lg:grid-cols-12">
        {inventory.isPending ? (
          <BentoCard className="lg:col-span-12">
            <p role="status" className="text-sm text-[#77756d]">
              Cargando inventario…
            </p>
          </BentoCard>
        ) : inventory.isError ? (
          <BentoCard className="lg:col-span-12">
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-sm">No pudimos cargar el inventario.</p>
              <button
                type="button"
                onClick={() => void inventory.refetch()}
                className="btn-secondary btn-sm"
              >
                Reintentar
              </button>
            </div>
          </BentoCard>
        ) : (
          <>
            <BentoCard className="lg:col-span-7">
              <fieldset>
                <legend className="eyebrow text-[#77756d]">
                  Equipamiento disponible
                </legend>
                <p className="mt-2 text-sm text-[#68675f]">
                  {
                    inventory.data.equipment.filter(
                      (i) => i.alwaysPresent || seleccion.has(i.code),
                    ).length
                  }{' '}
                  de {inventory.data.equipment.length} elementos marcados.
                </p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {inventory.data.equipment.map((item) => (
                    <li key={item.code}>
                      <label className="flex items-center gap-3 rounded-2xl border border-[#292823]/8 bg-white/70 p-3 text-sm font-medium transition hover:border-[#292823]/15 has-[:checked]:border-graphite has-[:checked]:bg-lime-soft/40">
                        <input
                          type="checkbox"
                          className="check"
                          disabled={item.alwaysPresent}
                          checked={
                            item.alwaysPresent || seleccion.has(item.code)
                          }
                          onChange={(event) =>
                            alternar(item.code, event.target.checked)
                          }
                        />
                        {item.name}
                        {item.alwaysPresent ? (
                          <span className="text-xs text-[#77756d]">
                            (siempre disponible)
                          </span>
                        ) : null}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <button
                type="button"
                disabled={guardar.isPending}
                aria-busy={guardar.isPending}
                onClick={() => guardar.mutate()}
                className="btn-primary mt-5"
              >
                {guardar.isPending ? 'Guardando…' : 'Guardar inventario'}
              </button>
              <p aria-live="polite" className="mt-2 text-xs text-[#68675f]">
                {guardar.isSuccess
                  ? `Inventario guardado.${guardar.data.markedIncompatible > 0 ? ` ${String(guardar.data.markedIncompatible)} ejercicios de rutinas vigentes quedaron incompatibles: los entrenadores van a verlos marcados.` : ''}${guardar.data.restored > 0 ? ` ${String(guardar.data.restored)} ejercicios volvieron a estar disponibles.` : ''}`
                  : guardar.isError
                    ? 'No pudimos guardar el inventario. Probá de nuevo.'
                    : ''}
              </p>
            </BentoCard>
            <BentoCard className="lg:col-span-5">
              <p className="eyebrow mb-4 text-[#77756d]">Cobertura</p>
              <Cobertura data={inventory.data} />
            </BentoCard>
          </>
        )}
      </main>
    </div>
  );
}
