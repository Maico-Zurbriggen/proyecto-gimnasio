import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { getExercise, listCatalog } from '../../../api/catalog';

/**
 * Elige el ejercicio realizado (HU22): sustituto del prescripto o ejercicio de
 * una serie adicional. Con `prescribedExerciseId` muestra primero alternativas
 * del mismo patrón de movimiento (catálogo aprobado y habilitado, sin el
 * prescripto); el buscador cubre el resto. Con `defaultExerciseId` ofrece
 * repetir ese ejercicio. El backend valida el ejercicio elegido.
 */
export function SubstituteExercisePanel({
  position,
  disabled,
  prescribedExerciseId,
  defaultExerciseId,
  onPick,
  onCancel,
}: {
  position: number;
  disabled: boolean;
  prescribedExerciseId?: string;
  defaultExerciseId?: string;
  onPick: (exerciseId: string) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState('');
  const prescribed = useQuery({
    queryKey: [
      'training-sessions',
      'substitutes',
      'exercise',
      prescribedExerciseId,
    ],
    queryFn: ({ signal }) => getExercise(prescribedExerciseId!, signal),
    enabled: !!prescribedExerciseId,
  });
  const pattern = prescribed.data?.movementPattern;
  const alternatives = useQuery({
    queryKey: ['training-sessions', 'substitutes', 'pattern', pattern],
    queryFn: ({ signal }) =>
      listCatalog(
        { pattern: pattern!, state: 'APROBADO', enabled: 'true', pageSize: 9 },
        signal,
      ),
    enabled: !!pattern,
  });
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
  const sameIds = new Set(alternatives.data?.items.map((e) => e.id));
  const sameItems = (alternatives.data?.items ?? []).filter(
    (e) => e.id !== prescribedExerciseId,
  );
  const otherItems = (results.data?.items ?? []).filter(
    (e) => e.id !== prescribedExerciseId && !sameIds.has(e.id),
  );
  const pick = (exercise: { id: string; name: string }) => (
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
  );

  return (
    <div className="surface-muted mt-3 flex flex-col gap-2">
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#68675f]">
        Buscar otro ejercicio
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          aria-label={`Buscar ejercicio para la serie ${String(position)}`}
          className="field min-h-11 px-3 py-2"
        />
      </label>
      {defaultExerciseId ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onPick(defaultExerciseId);
          }}
          className="btn-primary min-h-11"
        >
          Mismo ejercicio que la última serie
        </button>
      ) : null}
      {prescribedExerciseId ? (
        <section aria-label="Alternativas del mismo patrón de movimiento">
          <h3 className="text-xs font-semibold text-[#68675f]">
            Alternativas del mismo patrón de movimiento
          </h3>
          {prescribed.isPending || alternatives.isFetching ? (
            <p role="status">Buscando alternativas…</p>
          ) : null}
          {prescribed.isError || alternatives.isError ? (
            <p role="alert" className="field-error">
              No pudimos cargar las alternativas.
            </p>
          ) : null}
          {alternatives.data && sameItems.length === 0 ? (
            <p className="text-xs text-[#68675f]">Sin alternativas.</p>
          ) : null}
          <ul className="flex flex-col gap-1.5">{sameItems.map(pick)}</ul>
        </section>
      ) : null}
      <h3 className="text-xs font-semibold text-[#68675f]">Otros ejercicios</h3>
      {results.isPending ? <p role="status">Buscando…</p> : null}
      {results.isError ? (
        <p role="alert" className="field-error">
          No pudimos buscar ejercicios.
        </p>
      ) : null}
      {results.data && otherItems.length === 0 ? (
        <p className="text-xs text-[#68675f]">Sin resultados.</p>
      ) : null}
      <ul className="flex flex-col gap-1.5">{otherItems.map(pick)}</ul>
      <button type="button" onClick={onCancel} className="btn-ghost min-h-11">
        Cancelar
      </button>
    </div>
  );
}
