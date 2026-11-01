import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { listCatalog } from '../../../api/catalog';

/**
 * Elige el ejercicio realizado en lugar del prescripto (HU22).
 * No hay endpoint de alternativas compatibles: se busca en el catálogo
 * aprobado y habilitado, y el backend valida el ejercicio elegido.
 * shortcut: sin filtro por patrón de movimiento, afinar cuando exista el endpoint.
 */
export function SubstituteExercisePanel({
  position,
  disabled,
  onPick,
  onCancel,
}: {
  position: number;
  disabled: boolean;
  onPick: (exerciseId: string) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState('');
  const results = useQuery({
    queryKey: ['training-sessions', 'substitutes', search],
    queryFn: ({ signal }) =>
      listCatalog(
        {
          ...(search.trim() ? { search: search.trim() } : {}),
          state: 'APROBADO',
          enabled: 'true',
          pageSize: 8,
        },
        signal,
      ),
  });

  return (
    <div className="surface-muted mt-3 flex flex-col gap-2">
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#68675f]">
        Buscar ejercicio sustituto
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          aria-label={`Buscar sustituto de la serie ${String(position)}`}
          className="field min-h-11 px-3 py-2"
        />
      </label>
      {results.isPending ? <p role="status">Buscando…</p> : null}
      {results.isError ? (
        <p role="alert" className="field-error">
          No pudimos buscar ejercicios.
        </p>
      ) : null}
      {results.data?.items.length === 0 ? (
        <p className="text-xs text-[#68675f]">Sin resultados.</p>
      ) : null}
      <ul className="flex flex-col gap-1.5">
        {results.data?.items.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onPick(exercise.id);
              }}
              className="btn-secondary min-h-11 w-full justify-start"
            >
              {exercise.name}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onCancel} className="btn-ghost min-h-11">
        Cancelar
      </button>
    </div>
  );
}
