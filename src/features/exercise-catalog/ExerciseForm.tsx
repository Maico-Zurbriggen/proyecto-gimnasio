import { useState, type FormEvent } from 'react';
import type {
  CatalogExercise,
  ExerciseInput,
  Taxonomies,
} from '../../api/catalog';

export const patterns: ExerciseInput['movementPattern'][] = [
  'EMPUJE_HORIZONTAL',
  'EMPUJE_VERTICAL',
  'TRACCION_HORIZONTAL',
  'TRACCION_VERTICAL',
  'DOMINANTE_RODILLA',
  'DOMINANTE_CADERA',
  'CORE',
  'AISLAMIENTO_SUPERIOR',
  'AISLAMIENTO_INFERIOR',
];
export const label = (code: string) => code.toLowerCase().replaceAll('_', ' ');
export const fieldClass = 'field mt-1';
export const buttonClass = 'btn-primary';

export function CodeChoices({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { code: string; name: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-[#292823]/8 bg-white/70 p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <div className="grid max-h-48 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2">
        {options.map((item) => (
          <label className="flex items-start gap-2 text-sm" key={item.code}>
            <input
              type="checkbox"
              checked={value.includes(item.code)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, item.code]
                    : value.filter((code) => code !== item.code),
                )
              }
              className="check mt-1"
            />
            {item.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const empty: ExerciseInput = {
  name: '',
  description: null,
  instructions: '',
  tips: [],
  movementPattern: 'EMPUJE_HORIZONTAL',
  difficultyLevel: 'PRINCIPIANTE',
  unilateral: false,
  equipment: [],
  primaryMuscles: [],
  secondaryMuscles: [],
  joints: [],
  media: [{ pose: 'PRINCIPAL', url: '' }],
};
export function ExerciseForm({
  item,
  taxonomies,
  pending,
  onSave,
  onCancel,
}: {
  item: CatalogExercise | null;
  taxonomies: Taxonomies;
  pending: boolean;
  onSave: (input: ExerciseInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ExerciseInput>(
    item
      ? {
          name: item.name,
          description: item.description,
          instructions: item.instructions,
          tips: item.tips,
          movementPattern: item.movementPattern,
          difficultyLevel: item.difficultyLevel,
          unilateral: item.unilateral,
          equipment: item.equipment,
          primaryMuscles: item.primaryMuscles,
          secondaryMuscles: item.secondaryMuscles,
          joints: item.joints,
          media: item.media,
        }
      : empty,
  );
  const [error, setError] = useState('');
  const update = <K extends keyof ExerciseInput>(
    key: K,
    value: ExerciseInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !form.equipment.length ||
      !form.primaryMuscles.length ||
      !form.joints.length
    ) {
      setError(
        'Elegí equipamiento, al menos un músculo primario y una articulación.',
      );
      return;
    }
    if (
      form.primaryMuscles.some((code) => form.secondaryMuscles.includes(code))
    ) {
      setError('Un músculo no puede ser primario y secundario a la vez.');
      return;
    }
    onSave(form);
  }
  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-3xl border border-[#292823]/8 bg-white p-5 sm:p-6"
      aria-label={
        item ? 'Editar ejercicio propio' : 'Proponer ejercicio propio'
      }
    >
      <h2 className="font-display text-lg font-semibold tracking-tight">
        {item ? 'Editar ejercicio' : 'Proponer ejercicio propio'}
      </h2>
      <p className="text-sm text-[#68675f]">
        La ficha requiere revisión del administrador antes de habilitarla.
      </p>
      <label className="block text-sm font-medium">
        Nombre
        <input
          required
          minLength={2}
          maxLength={160}
          className={fieldClass}
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Descripción
        <textarea
          maxLength={1000}
          className={fieldClass}
          value={form.description ?? ''}
          onChange={(event) =>
            update('description', event.target.value || null)
          }
        />
      </label>
      <label className="block text-sm font-medium">
        Instrucciones
        <textarea
          required
          minLength={10}
          maxLength={12000}
          rows={5}
          className={fieldClass}
          value={form.instructions}
          onChange={(event) => update('instructions', event.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Consejos (uno por línea)
        <textarea
          maxLength={20000}
          rows={3}
          className={fieldClass}
          value={form.tips.join('\n')}
          onChange={(event) => update('tips', event.target.value.split('\n'))}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Patrón de movimiento
          <select
            className={fieldClass}
            value={form.movementPattern}
            onChange={(event) =>
              update(
                'movementPattern',
                event.target.value as ExerciseInput['movementPattern'],
              )
            }
          >
            {patterns.map((code) => (
              <option key={code} value={code}>
                {label(code)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Dificultad
          <select
            className={fieldClass}
            value={form.difficultyLevel}
            onChange={(event) =>
              update(
                'difficultyLevel',
                event.target.value as ExerciseInput['difficultyLevel'],
              )
            }
          >
            {['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO'].map((code) => (
              <option key={code} value={code}>
                {label(code)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          className="check"
          checked={form.unilateral}
          onChange={(event) => update('unilateral', event.target.checked)}
        />
        Movimiento unilateral
      </label>
      <CodeChoices
        title="Equipamiento requerido"
        options={taxonomies.equipment}
        value={form.equipment}
        onChange={(value) => update('equipment', value)}
      />
      <CodeChoices
        title="Músculos primarios"
        options={taxonomies.muscles}
        value={form.primaryMuscles}
        onChange={(value) => update('primaryMuscles', value)}
      />
      <CodeChoices
        title="Músculos secundarios"
        options={taxonomies.muscles}
        value={form.secondaryMuscles}
        onChange={(value) => update('secondaryMuscles', value)}
      />
      <CodeChoices
        title="Articulaciones involucradas"
        options={taxonomies.joints}
        value={form.joints}
        onChange={(value) => update('joints', value)}
      />
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Recursos visuales</legend>
        {form.media.map((media, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[9rem_1fr_auto]">
            <label className="text-sm">
              Pose
              <select
                className={fieldClass}
                value={media.pose}
                onChange={(event) =>
                  update(
                    'media',
                    form.media.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            pose: event.target.value as typeof media.pose,
                          }
                        : item,
                    ),
                  )
                }
              >
                {['PRINCIPAL', 'INICIO', 'FINAL'].map((pose) => (
                  <option key={pose}>{pose}</option>
                ))}
              </select>
            </label>
            {media.url.startsWith('/catalog/media/') ? (
              <p className="self-center text-sm">
                Ilustración del catálogo conservada
              </p>
            ) : (
              <label className="text-sm">
                URL HTTPS
                <input
                  required
                  type="url"
                  pattern="https://.*"
                  className={fieldClass}
                  value={media.url}
                  onChange={(event) =>
                    update(
                      'media',
                      form.media.map((item, i) =>
                        i === index
                          ? { ...item, url: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
            )}
            {form.media.length > 1 && (
              <button
                type="button"
                className="btn-ghost btn-sm self-end"
                onClick={() =>
                  update(
                    'media',
                    form.media.filter((_, i) => i !== index),
                  )
                }
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          disabled={form.media.length >= 6}
          className="btn-secondary btn-sm"
          onClick={() =>
            update('media', [...form.media, { pose: 'PRINCIPAL', url: '' }])
          }
        >
          Agregar recurso
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button disabled={pending} className={buttonClass} type="submit">
          {pending ? 'Guardando…' : 'Enviar a revisión'}
        </button>
        <button
          className="btn-secondary"
          type="button"
          disabled={pending}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
