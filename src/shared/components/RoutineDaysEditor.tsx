import { useState } from 'react';

import { listCatalog, type CatalogExercise } from '../../api/catalog';
import {
  blankDayForm,
  defaultSetForm,
  type RoutineDayForm,
} from '../lib/routine-days';

const INPUT_CLASS =
  'w-full rounded-xl border border-[#292823]/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-graphite';
const SMALL_BUTTON =
  'rounded-full border border-[#292823]/15 bg-white px-3 py-1 text-xs font-bold transition hover:brightness-95 disabled:opacity-60';
const DANGER_BUTTON =
  'rounded-full border border-red-800/30 bg-white px-3 py-1 text-xs font-bold text-red-900 transition hover:brightness-95 disabled:opacity-60';

function ExercisePicker({
  dayKey,
  onAdd,
}: {
  dayKey: string;
  onAdd: (dayKey: string, exercise: CatalogExercise) => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CatalogExercise[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Sin <form> propio: este buscador vive dentro del <form> principal y los
  // formularios anidados no existen en HTML (el navegador los ignora y el
  // botón terminaría enviando el formulario de afuera).
  function buscar() {
    if (search.trim().length < 2) return;
    setSearching(true);
    listCatalog({
      search: search.trim(),
      pageSize: 8,
      enabled: 'true',
    }).then(
      (page) => {
        setResults(page.items);
        setSearching(false);
        setSearched(true);
      },
      () => {
        setResults([]);
        setSearching(false);
        setSearched(true);
      },
    );
  }

  return (
    <div className="rounded-xl bg-[#292823]/5 p-3">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`buscar-${dayKey}`}>
          Buscar ejercicio habilitado
        </label>
        <input
          id={`buscar-${dayKey}`}
          className={INPUT_CLASS}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              buscar();
            }
          }}
          placeholder="Buscar ejercicio habilitado (mín. 2 letras)"
        />
        <button
          type="button"
          className={SMALL_BUTTON}
          disabled={searching || search.trim().length < 2}
          onClick={buscar}
        >
          {searching ? 'Buscando…' : 'Buscar'}
        </button>
      </div>
      {searched && results.length === 0 && !searching && (
        <p className="mt-2 text-xs">
          Sin resultados habilitados para esa búsqueda.
        </p>
      )}
      {results.length > 0 && (
        <ul className="mt-2 space-y-1">
          {results.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1 text-xs"
            >
              <span className="font-medium">{item.name}</span>
              <button
                type="button"
                className={SMALL_BUTTON}
                onClick={() => onAdd(dayKey, item)}
                aria-label={`Agregar ${item.name}`}
              >
                Agregar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface RoutineDaysEditorProps {
  days: RoutineDayForm[];
  onChange: (days: RoutineDayForm[]) => void;
}

/**
 * Editor controlado de días, ejercicios y series de una rutina o plantilla.
 * El orden de cada arreglo es la posición que se envía al backend.
 */
export function RoutineDaysEditor({ days, onChange }: RoutineDaysEditorProps) {
  function update(updater: (days: RoutineDayForm[]) => RoutineDayForm[]) {
    onChange(updater(days));
  }

  function addExercise(dayKey: string, exercise: CatalogExercise) {
    update((current) =>
      current.map((day) =>
        day.key === dayKey &&
        !day.exercises.some((item) => item.exerciseId === exercise.id)
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                {
                  key: `nuevo-${Date.now()}-${exercise.id}`,
                  exerciseId: exercise.id,
                  exerciseName: exercise.name,
                  note: '',
                  sets: [defaultSetForm()],
                },
              ],
            }
          : day,
      ),
    );
  }

  return (
    <div className="space-y-4">
      {days.map((day, dayIndex) => (
        <fieldset
          key={day.key}
          className="space-y-3 rounded-2xl border border-[#292823]/10 bg-white p-3"
        >
          <legend className="px-1 text-sm font-bold">Día {dayIndex + 1}</legend>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor={`dia-${day.key}`}>
              Nombre del día {dayIndex + 1}
            </label>
            <input
              id={`dia-${day.key}`}
              className={INPUT_CLASS}
              value={day.name}
              onChange={(event) =>
                update((current) =>
                  current.map((item) =>
                    item.key === day.key
                      ? { ...item, name: event.target.value }
                      : item,
                  ),
                )
              }
              maxLength={80}
              placeholder="p. ej. Día A - Empuje"
            />
            <button
              type="button"
              className={DANGER_BUTTON}
              disabled={days.length <= 1}
              onClick={() =>
                update((current) =>
                  current.filter((item) => item.key !== day.key),
                )
              }
              aria-label={`Quitar día ${dayIndex + 1}`}
            >
              Quitar
            </button>
          </div>

          {day.exercises.map((exercise) => (
            <div
              key={exercise.key}
              className="space-y-2 rounded-xl border border-[#292823]/10 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{exercise.exerciseName}</p>
                <button
                  type="button"
                  className={DANGER_BUTTON}
                  onClick={() =>
                    update((current) =>
                      current.map((item) =>
                        item.key === day.key
                          ? {
                              ...item,
                              exercises: item.exercises.filter(
                                (entry) => entry.key !== exercise.key,
                              ),
                            }
                          : item,
                      ),
                    )
                  }
                  aria-label={`Quitar ${exercise.exerciseName}`}
                >
                  Quitar
                </button>
              </div>
              <label
                className="block text-xs font-bold"
                htmlFor={`nota-${exercise.key}`}
              >
                Nota (opcional)
              </label>
              <input
                id={`nota-${exercise.key}`}
                className={INPUT_CLASS}
                value={exercise.note}
                onChange={(event) =>
                  update((current) =>
                    current.map((item) =>
                      item.key === day.key
                        ? {
                            ...item,
                            exercises: item.exercises.map((entry) =>
                              entry.key === exercise.key
                                ? { ...entry, note: event.target.value }
                                : entry,
                            ),
                          }
                        : item,
                    ),
                  )
                }
                maxLength={500}
                placeholder="Indicación para el alumno"
              />
              {exercise.sets.map((set, setIndex) => (
                <div
                  key={set.key}
                  className="grid grid-cols-2 gap-2 rounded-lg bg-[#292823]/5 p-2 sm:grid-cols-6"
                >
                  <span className="col-span-2 text-xs font-bold sm:col-span-6">
                    Serie {setIndex + 1}
                  </span>
                  <label className="text-xs">
                    Mín. reps
                    <input
                      className={INPUT_CLASS}
                      inputMode="numeric"
                      value={set.minRepetitions}
                      onChange={(event) =>
                        update((current) =>
                          current.map((item) =>
                            item.key === day.key
                              ? {
                                  ...item,
                                  exercises: item.exercises.map((entry) =>
                                    entry.key === exercise.key
                                      ? {
                                          ...entry,
                                          sets: entry.sets.map((serie) =>
                                            serie.key === set.key
                                              ? {
                                                  ...serie,
                                                  minRepetitions:
                                                    event.target.value,
                                                }
                                              : serie,
                                          ),
                                        }
                                      : entry,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="text-xs">
                    Máx. reps
                    <input
                      className={INPUT_CLASS}
                      inputMode="numeric"
                      value={set.maxRepetitions}
                      onChange={(event) =>
                        update((current) =>
                          current.map((item) =>
                            item.key === day.key
                              ? {
                                  ...item,
                                  exercises: item.exercises.map((entry) =>
                                    entry.key === exercise.key
                                      ? {
                                          ...entry,
                                          sets: entry.sets.map((serie) =>
                                            serie.key === set.key
                                              ? {
                                                  ...serie,
                                                  maxRepetitions:
                                                    event.target.value,
                                                }
                                              : serie,
                                          ),
                                        }
                                      : entry,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="text-xs">
                    Carga (kg)
                    <input
                      className={INPUT_CLASS}
                      inputMode="decimal"
                      placeholder="—"
                      value={set.suggestedLoad}
                      onChange={(event) =>
                        update((current) =>
                          current.map((item) =>
                            item.key === day.key
                              ? {
                                  ...item,
                                  exercises: item.exercises.map((entry) =>
                                    entry.key === exercise.key
                                      ? {
                                          ...entry,
                                          sets: entry.sets.map((serie) =>
                                            serie.key === set.key
                                              ? {
                                                  ...serie,
                                                  suggestedLoad:
                                                    event.target.value,
                                                }
                                              : serie,
                                          ),
                                        }
                                      : entry,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="text-xs">
                    Descanso (s)
                    <input
                      className={INPUT_CLASS}
                      inputMode="numeric"
                      value={set.restSeconds}
                      onChange={(event) =>
                        update((current) =>
                          current.map((item) =>
                            item.key === day.key
                              ? {
                                  ...item,
                                  exercises: item.exercises.map((entry) =>
                                    entry.key === exercise.key
                                      ? {
                                          ...entry,
                                          sets: entry.sets.map((serie) =>
                                            serie.key === set.key
                                              ? {
                                                  ...serie,
                                                  restSeconds:
                                                    event.target.value,
                                                }
                                              : serie,
                                          ),
                                        }
                                      : entry,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="flex items-end gap-1 pb-2 text-xs">
                    <input
                      type="checkbox"
                      checked={set.warmup}
                      onChange={(event) =>
                        update((current) =>
                          current.map((item) =>
                            item.key === day.key
                              ? {
                                  ...item,
                                  exercises: item.exercises.map((entry) =>
                                    entry.key === exercise.key
                                      ? {
                                          ...entry,
                                          sets: entry.sets.map((serie) =>
                                            serie.key === set.key
                                              ? {
                                                  ...serie,
                                                  warmup: event.target.checked,
                                                }
                                              : serie,
                                          ),
                                        }
                                      : entry,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    Entrada en calor
                  </label>
                  <button
                    type="button"
                    className={`${DANGER_BUTTON} col-span-2 self-end sm:col-span-1`}
                    disabled={exercise.sets.length <= 1}
                    onClick={() =>
                      update((current) =>
                        current.map((item) =>
                          item.key === day.key
                            ? {
                                ...item,
                                exercises: item.exercises.map((entry) =>
                                  entry.key === exercise.key
                                    ? {
                                        ...entry,
                                        sets: entry.sets.filter(
                                          (serie) => serie.key !== set.key,
                                        ),
                                      }
                                    : entry,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                    aria-label={`Quitar serie ${setIndex + 1} de ${exercise.exerciseName}`}
                  >
                    Quitar serie
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={SMALL_BUTTON}
                disabled={exercise.sets.length >= 10}
                onClick={() =>
                  update((current) =>
                    current.map((item) =>
                      item.key === day.key
                        ? {
                            ...item,
                            exercises: item.exercises.map((entry) =>
                              entry.key === exercise.key
                                ? {
                                    ...entry,
                                    sets: [...entry.sets, defaultSetForm()],
                                  }
                                : entry,
                            ),
                          }
                        : item,
                    ),
                  )
                }
              >
                Agregar serie
              </button>
            </div>
          ))}

          <ExercisePicker dayKey={day.key} onAdd={addExercise} />
        </fieldset>
      ))}

      <button
        type="button"
        className={SMALL_BUTTON}
        disabled={days.length >= 7}
        onClick={() => onChange([...days, blankDayForm()])}
      >
        Agregar día ({days.length}/7)
      </button>
    </div>
  );
}
