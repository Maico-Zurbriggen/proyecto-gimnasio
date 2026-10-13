import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  catalogError,
  createExercise,
  getExercise,
  getInventory,
  getTaxonomies,
  listCatalog,
  reviewExercise,
  setAvailability,
  setInventory,
  updateExercise,
  type AvailabilityChange,
  type CatalogExercise,
  type CatalogQuery,
  type Taxonomies,
} from '../../api/catalog';
import { useSession } from '../auth/hooks/useSession';
import { PageHeader } from '../../shared/ui/PageHeader';
import { ExerciseImage } from './ExerciseImage';
import { MuscleMap } from './MuscleMap';
import {
  CodeChoices,
  ExerciseForm,
  buttonClass,
  fieldClass,
  label,
  patterns,
} from './ExerciseForm';

function InventoryPanel({
  inventory,
  taxonomies,
  onSaved,
  onReload,
}: {
  inventory: {
    equipment: string[];
    updatedAt: string | null;
    revision: number;
  };
  taxonomies: Taxonomies;
  onSaved: (items: { id: string; name: string }[]) => void;
  onReload: () => void;
}) {
  const [equipment, setEquipment] = useState(inventory.equipment);
  const mutation = useMutation({
    mutationFn: () =>
      setInventory({ equipment, expectedRevision: inventory.revision }),
    onSuccess: (result) => onSaved(result.relatedExercises),
  });
  return (
    <details className="rounded-2xl border border-[#d7d5ca] bg-white p-4">
      <summary className="cursor-pointer font-semibold">
        Equipamiento del gimnasio
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-[#706e65]">
          El inventario aporta contexto a la IA. Cambiarlo requiere revisar los
          ejercicios relacionados. Las habilitaciones se guardan desde el
          catálogo.
        </p>
        <CodeChoices
          title="Equipamiento presente"
          options={taxonomies.equipment.filter(
            (item) => item.code !== 'PESO_CORPORAL',
          )}
          value={equipment}
          onChange={setEquipment}
        />
        <p className="text-xs text-[#706e65]">
          El peso corporal siempre está disponible como contexto.
        </p>
        <button
          className={buttonClass}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Guardando…' : 'Guardar inventario'}
        </button>
        {mutation.error && (
          <p role="alert" className="text-sm text-red-800">
            {catalogError(mutation.error)}{' '}
            <button type="button" className="underline" onClick={onReload}>
              Recargar inventario
            </button>
          </p>
        )}
        {mutation.data && (
          <p role="status" className="text-sm">
            Inventario guardado. Revisá{' '}
            {mutation.data.relatedExerciseIds.length} ejercicios habilitados
            relacionados con el cambio.
          </p>
        )}
      </div>
    </details>
  );
}

function ExerciseDetail({
  item,
  taxonomies,
  admin,
  editable,
  onClose,
  onEdit,
  onReviewed,
}: {
  item: CatalogExercise;
  taxonomies: Taxonomies;
  admin: boolean;
  editable: boolean;
  onClose: () => void;
  onEdit: () => void;
  onReviewed: (item: CatalogExercise) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [observation, setObservation] = useState('');
  const [localError, setLocalError] = useState('');
  const [enableOnApproval, setEnableOnApproval] = useState(false);
  const mutation = useMutation({
    mutationFn: (state: 'APROBADO' | 'RECHAZADO' | 'DESACTIVADO') =>
      reviewExercise(item.id, {
        expectedRevision: item.revision,
        state,
        observation: observation.trim() || null,
        enable: state === 'APROBADO' && enableOnApproval,
      }),
    onSuccess: onReviewed,
  });
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => {
      node?.close();
    };
  }, []);
  const names = (codes: string[], options: { code: string; name: string }[]) =>
    codes
      .map(
        (code) =>
          options.find((item) => item.code === code)?.name ?? label(code),
      )
      .join(', ') || 'Sin participación indicada';
  const review = (state: 'APROBADO' | 'RECHAZADO' | 'DESACTIVADO') => {
    if (state !== 'APROBADO' && !observation.trim()) {
      setLocalError('Escribí el motivo de la decisión.');
      return;
    }
    setLocalError('');
    mutation.mutate(state);
  };
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-auto rounded-2xl bg-[#f7f6ef] p-5 text-[#252720] shadow-xl backdrop:bg-black/50"
      aria-labelledby="exercise-detail-title"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="exercise-detail-title" className="text-xl font-semibold">
          {item.name}
        </h2>
        <button
          autoFocus
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1 text-sm underline"
        >
          Cerrar
        </button>
      </div>
      <p className="my-3 text-sm">
        {label(item.difficultyLevel)} · {label(item.movementPattern)}
        {item.unilateral ? ' · unilateral' : ''}
      </p>
      <p className="text-sm font-medium">
        {item.enabled
          ? 'Habilitado en tu gimnasio'
          : 'No habilitado en tu gimnasio'}{' '}
        · {label(item.state)}
      </p>
      <div className="my-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid content-start grid-cols-2 gap-3">
          {item.media.map((media, index) => (
            <figure key={`${media.url}-${index}`}>
              <ExerciseImage
                url={media.url}
                alt={`${item.name}: ${label(media.pose)}`}
              />
              <figcaption className="mt-1 text-center text-xs">
                {label(media.pose)}
              </figcaption>
            </figure>
          ))}
          {item.media.length === 0 && (
            <p className="col-span-2 py-6 text-sm text-[#706e65]">
              Esta ficha todavía no tiene imágenes del ejercicio.
            </p>
          )}
        </div>
        <MuscleMap
          primary={item.primaryMuscles}
          secondary={item.secondaryMuscles}
          muscles={taxonomies.muscles}
        />
      </div>
      {item.description && (
        <p className="my-3 text-sm leading-6">{item.description}</p>
      )}
      <h3 className="font-semibold">Técnica</h3>
      <p className="mt-2 whitespace-pre-line text-sm leading-6">
        {item.instructions}
      </p>
      {item.tips.length > 0 && (
        <>
          <h3 className="mt-4 font-semibold">Consejos</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {item.tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </>
      )}
      <dl className="my-5 space-y-3 text-sm">
        {[
          [
            'Músculos primarios',
            names(item.primaryMuscles, taxonomies.muscles),
          ],
          [
            'Músculos secundarios',
            names(item.secondaryMuscles, taxonomies.muscles),
          ],
          [
            'Equipamiento',
            item.equipment.length
              ? names(item.equipment, taxonomies.equipment)
              : 'Sin equipamiento registrado',
          ],
          [
            'Articulaciones',
            item.joints.length
              ? names(item.joints, taxonomies.joints)
              : 'Sin articulaciones registradas',
          ],
        ].map(([term, value]) => (
          <div key={term}>
            <dt className="font-semibold">{term}</dt>
            <dd className="mt-1">{value}</dd>
          </div>
        ))}
      </dl>
      {item.reviewObservation && (
        <p className="mb-4 rounded-xl bg-white p-3 text-sm">
          Revisión: {item.reviewObservation}
        </p>
      )}
      {editable && (
        <button type="button" className={buttonClass} onClick={onEdit}>
          Editar y enviar a revisión
        </button>
      )}
      {admin && item.origin === 'GIMNASIO' && (
        <section className="mt-5 space-y-3 border-t border-[#d7d5ca] pt-4">
          <h3 className="font-semibold">Revisión de la ficha propia</h3>
          <label className="block text-sm">
            Observación
            <textarea
              className={fieldClass}
              maxLength={1000}
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
            />
          </label>
          {['PROPUESTO', 'DESACTIVADO'].includes(item.state) && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enableOnApproval}
                onChange={(event) => setEnableOnApproval(event.target.checked)}
                className="accent-[#567322]"
              />
              Habilitar en el gimnasio al aprobar
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            {['PROPUESTO', 'DESACTIVADO'].includes(item.state) && (
              <button
                type="button"
                disabled={mutation.isPending}
                className={buttonClass}
                onClick={() => review('APROBADO')}
              >
                Aprobar ficha
              </button>
            )}
            {item.state === 'PROPUESTO' && (
              <button
                type="button"
                disabled={mutation.isPending}
                className="rounded-xl border border-red-800 px-4 py-2 text-sm text-red-800"
                onClick={() => review('RECHAZADO')}
              >
                Rechazar
              </button>
            )}
            {item.state === 'APROBADO' && (
              <button
                type="button"
                disabled={mutation.isPending}
                className="rounded-xl border border-red-800 px-4 py-2 text-sm text-red-800"
                onClick={() => review('DESACTIVADO')}
              >
                Retirar ficha
              </button>
            )}
          </div>
          <p className="text-xs text-[#706e65]">
            La habilitación al aprobar requiere seleccionar la opción anterior.
            Retirar la ficha la deshabilita y conserva sus usos anteriores.
          </p>
          {(localError || mutation.error) && (
            <p role="alert" className="text-sm text-red-800">
              {localError || catalogError(mutation.error)}
            </p>
          )}
        </section>
      )}
      {(item.source === 'RepDB' ||
        item.media.some((media) =>
          media.url.startsWith('/catalog/media/'),
        )) && (
        <p className="mt-5 text-xs">
          Exercise data by RepDB (
          <a
            href="https://repdb.co"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            repdb.co
          </a>
          )
        </p>
      )}
    </dialog>
  );
}

export function CatalogPage({ manage = false }: { manage?: boolean }) {
  const { user } = useSession();
  return (
    <CatalogContent
      key={`${user?.gymId}:${user?.id}:${manage}`}
      manage={manage}
    />
  );
}

function CatalogContent({ manage }: { manage: boolean }) {
  const { user } = useSession();
  const admin = manage && !!user?.roles.includes('ADMINISTRADOR');
  const trainer = !!user?.roles.includes('ENTRENADOR');
  const cache = useQueryClient();
  const scope = ['catalog', user?.gymId, user?.id] as const;
  const [query, setQuery] = useState<NonNullable<CatalogQuery>>({
    page: 1,
    pageSize: 24,
    ...(admin ? {} : { enabled: 'true' }),
  });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CatalogExercise | null>(null);
  const [form, setForm] = useState<{ item: CatalogExercise | null } | null>(
    null,
  );
  const [changes, setChanges] = useState<Record<string, AvailabilityChange>>(
    {},
  );
  const [message, setMessage] = useState('');
  const [relatedExercises, setRelatedExercises] = useState<
    { id: string; name: string }[]
  >([]);
  const detailQuery = useMutation({
    mutationFn: (id: string) =>
      cache.fetchQuery({
        queryKey: [...scope, 'detail', id],
        queryFn: ({ signal }) => getExercise(id, signal),
        staleTime: 0,
      }),
    onSuccess: setSelected,
  });
  const catalog = useQuery({
    queryKey: [...scope, 'list', query],
    queryFn: ({ signal }) => listCatalog(query, signal),
    enabled: !!user,
  });
  const taxonomies = useQuery({
    queryKey: [...scope, 'taxonomies'],
    queryFn: ({ signal }) => getTaxonomies(signal),
    enabled: !!user,
    staleTime: 300000,
  });
  const inventory = useQuery({
    queryKey: [...scope, 'inventory'],
    queryFn: ({ signal }) => getInventory(signal),
    enabled: admin,
  });
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: scope });
  };
  const availability = useMutation({
    mutationFn: () => setAvailability(Object.values(changes)),
    onSuccess: (result) => {
      setChanges({});
      setMessage(`${result.changed} cambios de disponibilidad guardados.`);
      refresh();
    },
  });
  const save = useMutation({
    mutationFn: (input: Parameters<typeof createExercise>[0]) =>
      form?.item
        ? updateExercise(form.item.id, {
            expectedRevision: form.item.revision,
            exercise: input,
          })
        : createExercise(input),
    onSuccess: () => {
      setForm(null);
      setSearch('');
      setQuery({
        page: 1,
        pageSize: 24,
        origin: 'GIMNASIO',
        state: 'PROPUESTO',
      });
      setMessage('Ficha enviada a revisión.');
      refresh();
    },
  });
  const filter = <K extends keyof NonNullable<CatalogQuery>>(
    key: K,
    value: NonNullable<CatalogQuery>[K],
  ) => setQuery((current) => ({ ...current, [key]: value, page: 1 }));
  const toggle = (item: CatalogExercise, enabled: boolean) => {
    const next = { ...changes };
    if (enabled === item.enabled) delete next[item.id];
    else
      next[item.id] = {
        exerciseId: item.id,
        enabled,
        expectedRevision: item.availabilityRevision,
      };
    if (Object.keys(next).length > 200) {
      setMessage('Guardá este lote de 200 cambios antes de continuar.');
      return;
    }
    setChanges(next);
  };
  const canEdit = (item: CatalogExercise) =>
    trainer &&
    item.origin === 'GIMNASIO' &&
    item.authorUserId === user?.id &&
    item.state !== 'APROBADO';
  return (
    <div>
      <PageHeader
        kicker={admin ? 'Gestión del catálogo' : 'Catálogo de ejercicios'}
        title={admin ? 'Ejercicios de tu gimnasio' : 'Conocé cada movimiento'}
        description={
          admin
            ? 'Revisá las fichas propias y elegí los ejercicios disponibles para entrenar.'
            : 'Técnica, músculos y equipamiento de los ejercicios disponibles.'
        }
      />
      <main className="space-y-5 px-4 pb-10 sm:px-7 lg:px-9">
        {message && (
          <p role="status" className="rounded-xl bg-[#e9efd8] p-3 text-sm">
            {message}
          </p>
        )}
        {admin && inventory.data && taxonomies.data && (
          <InventoryPanel
            key={inventory.data.revision}
            inventory={inventory.data}
            taxonomies={taxonomies.data}
            onReload={() => void inventory.refetch()}
            onSaved={(items) => {
              setRelatedExercises(items);
              setMessage(
                `Inventario guardado. Revisá ${items.length} ejercicios habilitados relacionados con el cambio.`,
              );
              refresh();
            }}
          />
        )}
        {relatedExercises.length > 0 && (
          <section className="rounded-xl border border-[#d7d5ca] p-4">
            <h2 className="font-semibold">
              Ejercicios relacionados con el inventario
            </h2>
            <ul className="mt-2 space-y-2">
              {relatedExercises.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={detailQuery.isPending}
                    className="text-sm underline"
                    onClick={() => detailQuery.mutate(item.id)}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 text-sm underline"
              onClick={() => setRelatedExercises([])}
            >
              Cerrar lista
            </button>
          </section>
        )}
        {detailQuery.error && (
          <p role="alert" className="text-sm text-red-800">
            {catalogError(detailQuery.error)}
          </p>
        )}
        {inventory.error && (
          <p role="alert" className="text-sm text-red-800">
            No pudimos cargar el inventario.{' '}
            <button
              type="button"
              className="underline"
              onClick={() => void inventory.refetch()}
            >
              Reintentar
            </button>
          </p>
        )}
        {trainer && !form && (
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              save.reset();
              setForm({ item: null });
            }}
          >
            Proponer ejercicio propio
          </button>
        )}
        {form && taxonomies.data && (
          <ExerciseForm
            key={form.item?.id ?? 'new'}
            item={form.item}
            taxonomies={taxonomies.data}
            pending={save.isPending}
            onSave={(input) =>
              save.mutate({
                ...input,
                tips: input.tips.map((tip) => tip.trim()).filter(Boolean),
              })
            }
            onCancel={() => {
              setForm(null);
              save.reset();
            }}
          />
        )}
        {save.error && (
          <p role="alert" className="text-sm text-red-800">
            {catalogError(save.error)}
          </p>
        )}
        <section
          className="space-y-4 rounded-2xl bg-[#f7f6ef] p-4"
          aria-label="Buscar y filtrar ejercicios"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              filter('search', search.trim() || undefined);
            }}
            className="flex items-end gap-2"
          >
            <label className="min-w-0 flex-1 text-sm font-medium">
              Buscar por nombre
              <input
                className={fieldClass}
                maxLength={160}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ej. press de banca"
              />
            </label>
            <button type="submit" className={buttonClass}>
              Buscar
            </button>
          </form>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              Disponibilidad
              <select
                className={fieldClass}
                value={query.enabled ?? ''}
                onChange={(event) =>
                  filter(
                    'enabled',
                    event.target.value
                      ? (event.target.value as 'true' | 'false')
                      : undefined,
                  )
                }
              >
                <option value="">Todos los ejercicios</option>
                <option value="true">Habilitados en el gimnasio</option>
                <option value="false">No habilitados</option>
              </select>
            </label>
            <label className="text-sm">
              Origen
              <select
                className={fieldClass}
                value={query.origin ?? ''}
                onChange={(event) =>
                  filter(
                    'origin',
                    event.target.value
                      ? (event.target.value as 'CATALOGO_BASE' | 'GIMNASIO')
                      : undefined,
                  )
                }
              >
                <option value="">Todos</option>
                <option value="CATALOGO_BASE">Catálogo base</option>
                <option value="GIMNASIO">Propios del gimnasio</option>
              </select>
            </label>
            {(['muscle', 'equipment'] as const).map((key) => (
              <label key={key} className="text-sm">
                {key === 'muscle' ? 'Músculo' : 'Equipamiento'}
                <select
                  className={fieldClass}
                  value={query[key] ?? ''}
                  onChange={(event) =>
                    filter(key, event.target.value || undefined)
                  }
                >
                  <option value="">Todos</option>
                  {(key === 'muscle'
                    ? taxonomies.data?.muscles
                    : taxonomies.data?.equipment
                  )?.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="text-sm">
              Patrón
              <select
                className={fieldClass}
                value={query.pattern ?? ''}
                onChange={(event) =>
                  filter(
                    'pattern',
                    event.target.value
                      ? (event.target.value as typeof query.pattern)
                      : undefined,
                  )
                }
              >
                <option value="">Todos</option>
                {patterns.map((code) => (
                  <option key={code} value={code}>
                    {label(code)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Dificultad
              <select
                className={fieldClass}
                value={query.difficulty ?? ''}
                onChange={(event) =>
                  filter(
                    'difficulty',
                    event.target.value
                      ? (event.target.value as typeof query.difficulty)
                      : undefined,
                  )
                }
              >
                <option value="">Todas</option>
                {['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO'].map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </select>
            </label>
            {(admin || trainer) && (
              <label className="text-sm">
                Estado de la ficha
                <select
                  className={fieldClass}
                  value={query.state ?? ''}
                  onChange={(event) =>
                    filter(
                      'state',
                      event.target.value
                        ? (event.target.value as typeof query.state)
                        : undefined,
                    )
                  }
                >
                  <option value="">Todos</option>
                  {['PROPUESTO', 'APROBADO', 'RECHAZADO', 'DESACTIVADO'].map(
                    (code) => (
                      <option key={code}>{code}</option>
                    ),
                  )}
                </select>
              </label>
            )}
          </div>
        </section>
        {taxonomies.error && (
          <p role="alert" className="text-sm text-red-800">
            No pudimos cargar las clasificaciones.{' '}
            <button
              className="underline"
              onClick={() => void taxonomies.refetch()}
            >
              Reintentar
            </button>
          </p>
        )}
        {admin && Object.keys(changes).length > 0 && (
          <section
            aria-label="Cambios pendientes"
            className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl bg-[#e0e8c9] p-3 shadow"
          >
            <p className="text-sm">
              {Object.keys(changes).length} cambios sin guardar
            </p>
            <button
              type="button"
              className={buttonClass}
              disabled={availability.isPending}
              onClick={() => availability.mutate()}
            >
              {availability.isPending ? 'Guardando…' : 'Guardar disponibilidad'}
            </button>
            <button
              type="button"
              disabled={availability.isPending}
              className="text-sm underline"
              onClick={() => {
                setChanges({});
                availability.reset();
              }}
            >
              Descartar cambios
            </button>
          </section>
        )}
        {availability.error && (
          <p role="alert" className="text-sm text-red-800">
            {catalogError(availability.error)}{' '}
            <button
              type="button"
              className="underline"
              onClick={() => {
                setChanges({});
                availability.reset();
                refresh();
              }}
            >
              Recargar
            </button>
          </p>
        )}
        {catalog.isLoading && (
          <p role="status" className="py-10 text-center">
            Cargando ejercicios…
          </p>
        )}
        {catalog.error && (
          <p role="alert" className="rounded-xl bg-white p-5">
            {catalogError(catalog.error)}{' '}
            <button
              className="underline"
              onClick={() => void catalog.refetch()}
            >
              Reintentar
            </button>
          </p>
        )}
        {catalog.data && (
          <>
            <p className="text-sm text-[#706e65]">
              {catalog.data.total} ejercicios
              {catalog.isFetching ? ' · actualizando…' : ''}
            </p>
            {catalog.data.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#c5c7b8] p-8 text-center">
                <h2 className="font-semibold">
                  No hay ejercicios para esta selección
                </h2>
                <p className="mt-2 text-sm text-[#706e65]">
                  {query.enabled === 'true'
                    ? 'El administrador debe habilitar ejercicios para que puedan usarse al generar una rutina.'
                    : 'Probá otros filtros o un nombre distinto.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {catalog.data.items.map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-[#d7d5ca] bg-white p-4"
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      disabled={!taxonomies.data}
                      className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#567322]"
                    >
                      <ExerciseImage
                        url={item.media[0]?.url ?? ''}
                        alt={item.name}
                        fallback={
                          <MuscleMap
                            compact
                            primary={item.primaryMuscles}
                            secondary={item.secondaryMuscles}
                            muscles={taxonomies.data?.muscles ?? []}
                          />
                        }
                      />
                      <h2 className="mt-3 text-lg font-semibold">
                        {item.name}
                      </h2>
                      <p className="mt-1 text-sm text-[#706e65]">
                        {label(item.difficultyLevel)} ·{' '}
                        {label(item.movementPattern)}
                      </p>
                      <p className="mt-2 text-sm">
                        {item.primaryMuscles
                          .map(
                            (code) =>
                              taxonomies.data?.muscles.find(
                                (muscle) => muscle.code === code,
                              )?.name ?? label(code),
                          )
                          .join(', ')}
                      </p>
                      <p className="mt-2 text-xs font-medium">
                        {item.enabled ? 'Habilitado' : 'No habilitado'}
                        {item.state !== 'APROBADO'
                          ? ` · ${label(item.state)}`
                          : ''}
                      </p>
                      <p className="mt-3 text-sm underline">
                        Ver técnica y ficha
                      </p>
                    </button>
                    {admin && (
                      <label className="mt-4 flex items-center gap-2 border-t border-[#eeeede] pt-3 text-sm">
                        <input
                          type="checkbox"
                          checked={changes[item.id]?.enabled ?? item.enabled}
                          disabled={
                            item.state !== 'APROBADO' || availability.isPending
                          }
                          onChange={(event) =>
                            toggle(item, event.target.checked)
                          }
                          className="accent-[#567322]"
                        />
                        Disponible en el gimnasio
                      </label>
                    )}
                  </article>
                ))}
              </div>
            )}
            <nav
              aria-label="Páginas del catálogo"
              className="flex items-center justify-center gap-3"
            >
              <button
                type="button"
                className={buttonClass}
                disabled={catalog.data.page <= 1}
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    page: (current.page ?? 1) - 1,
                  }))
                }
              >
                Anterior
              </button>
              <span className="text-sm">
                {catalog.data.page} /{' '}
                {Math.max(
                  1,
                  Math.ceil(catalog.data.total / catalog.data.pageSize),
                )}
              </span>
              <button
                type="button"
                className={buttonClass}
                disabled={
                  catalog.data.page * catalog.data.pageSize >=
                  catalog.data.total
                }
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    page: (current.page ?? 1) + 1,
                  }))
                }
              >
                Siguiente
              </button>
            </nav>
          </>
        )}
        <p className="text-xs text-[#706e65]">
          Exercise data by RepDB (
          <a
            href="https://repdb.co"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            repdb.co
          </a>
          ). Las imágenes ilustran la técnica; cada rutina requiere revisión del
          entrenador.
        </p>
        {selected && taxonomies.data && (
          <ExerciseDetail
            key={selected.id}
            item={selected}
            taxonomies={taxonomies.data}
            admin={admin}
            editable={canEdit(selected)}
            onClose={() => setSelected(null)}
            onEdit={() => {
              setForm({ item: selected });
              save.reset();
              setSelected(null);
            }}
            onReviewed={(item) => {
              setSelected(item);
              setMessage(
                item.state === 'APROBADO'
                  ? item.enabled
                    ? 'Ficha aprobada y habilitada en el gimnasio.'
                    : 'Ficha aprobada. Podés habilitarla desde el catálogo.'
                  : `Ficha ${label(item.state)}. La decisión quedó registrada.`,
              );
              refresh();
            }}
          />
        )}
      </main>
    </div>
  );
}
