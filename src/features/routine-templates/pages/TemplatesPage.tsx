import { useState } from 'react';

import type { WriteTemplate } from '../../../api/prescriptions';
import { Banner } from '../../../shared/components/Banner';
import { BentoCard } from '../../../shared/ui/BentoCard';
import {
  useCreateRoutineTemplate,
  useManagedRoutineTemplate,
  useManagedRoutineTemplates,
  useSetRoutineTemplateActive,
  useUpdateRoutineTemplate,
} from '../hooks/useRoutineTemplatesManage';
import {
  detailToForm,
  templateErrorMessage,
  TemplateForm,
  type TemplateFormDay,
} from '../components/TemplateForm';

type Mode =
  { view: 'list' } | { view: 'create' } | { view: 'edit'; templateId: string };

function EditView({
  templateId,
  onDone,
}: {
  templateId: string;
  onDone: (message: string) => void;
}) {
  const detail = useManagedRoutineTemplate(templateId);
  const update = useUpdateRoutineTemplate(templateId);

  if (detail.isLoading) return <p className="text-sm">Cargando plantilla…</p>;
  if (detail.isError || !detail.data)
    return (
      <div className="space-y-3">
        <Banner variant="danger" title="No pudimos cargar la plantilla">
          <p>Intentá nuevamente en un momento.</p>
        </Banner>
        <button
          type="button"
          className="rounded-full border border-[#292823]/15 bg-white px-4 py-2 text-sm font-bold"
          onClick={() => detail.refetch()}
        >
          Reintentar
        </button>
      </div>
    );

  const initialDays: TemplateFormDay[] = detailToForm({
    name: detail.data.name,
    routineType: detail.data.routineType,
    days: detail.data.days.map((day) => ({
      name: day.name,
      exercises: day.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName ?? 'Ejercicio del catálogo',
        note: exercise.note,
        sets: exercise.sets.map((set) => ({
          minRepetitions: set.minRepetitions,
          maxRepetitions: set.maxRepetitions,
          suggestedLoad: set.suggestedLoad,
          restSeconds: set.restSeconds,
          warmup: set.warmup,
        })),
      })),
    })),
  });

  return (
    <TemplateForm
      key={detail.data.id}
      initialName={detail.data.name}
      initialType={detail.data.routineType}
      initialDays={initialDays}
      submitLabel="Guardar cambios"
      pending={update.isPending}
      problems={update.isError ? [templateErrorMessage(update.error)] : []}
      onSubmit={(input: WriteTemplate) =>
        update.mutate(input, {
          onSuccess: () => onDone('Plantilla actualizada.'),
        })
      }
    />
  );
}

/**
 * Creación manual de plantillas (RF-019, RF-020, RF-082).
 *
 * La plantilla es privada del gimnasio y reutilizable: asignarla copia su
 * contenido como rutina propuesta sin atarla a futuros cambios (RN-33).
 */
export function TemplatesPage() {
  const [mode, setMode] = useState<Mode>({ view: 'list' });
  const [notice, setNotice] = useState<string | null>(null);
  const templates = useManagedRoutineTemplates();
  const create = useCreateRoutineTemplate();
  const toggleActive = useSetRoutineTemplateActive();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function done(message: string) {
    setNotice(message);
    setMode({ view: 'list' });
  }

  if (mode.view === 'create') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="rounded-full border border-[#292823]/15 bg-white px-4 py-2 text-sm font-bold"
          onClick={() => {
            create.reset();
            setMode({ view: 'list' });
          }}
        >
          ← Volver al listado
        </button>
        <BentoCard className="flex flex-col gap-4">
          <div>
            <p className="eyebrow text-[#77756d]">Plantillas</p>
            <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.06em]">
              Nueva plantilla
            </h2>
            <p className="mt-2 text-xs text-[#77756d]">
              Días ordenados con ejercicios del catálogo habilitado y sus
              series.
            </p>
          </div>
          <TemplateForm
            submitLabel="Crear plantilla"
            pending={create.isPending}
            problems={
              create.isError ? [templateErrorMessage(create.error)] : []
            }
            onSubmit={(input: WriteTemplate) =>
              create.mutate(input, {
                onSuccess: () => {
                  create.reset();
                  done('Plantilla creada.');
                },
              })
            }
          />
        </BentoCard>
      </div>
    );
  }

  if (mode.view === 'edit') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="rounded-full border border-[#292823]/15 bg-white px-4 py-2 text-sm font-bold"
          onClick={() => setMode({ view: 'list' })}
        >
          ← Volver al listado
        </button>
        <BentoCard className="flex flex-col gap-4">
          <div>
            <p className="eyebrow text-[#77756d]">Plantillas</p>
            <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.06em]">
              Editar plantilla
            </h2>
            <p className="mt-2 text-xs text-[#77756d]">
              Reemplaza su contenido. Las rutinas ya asignadas no cambian.
            </p>
          </div>
          <EditView templateId={mode.templateId} onDone={done} />
        </BentoCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notice && (
        <Banner
          variant="info"
          title={notice}
          onDismiss={() => setNotice(null)}
        />
      )}
      <BentoCard className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-[#77756d]">Plantillas</p>
            <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.06em]">
              Bases reutilizables, no rígidas
            </h2>
            <p className="mt-2 text-xs text-[#77756d]">
              Asignar una plantilla copia su contenido como propuesta para el
              alumno.
            </p>
          </div>
          <button
            type="button"
            className="bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
            onClick={() => {
              setNotice(null);
              setMode({ view: 'create' });
            }}
          >
            Nueva plantilla
          </button>
        </div>

        {templates.isLoading && <p className="text-sm">Cargando plantillas…</p>}
        {templates.isError && (
          <div className="space-y-3">
            <Banner variant="danger" title="No pudimos cargar las plantillas">
              <p>Intentá nuevamente en un momento.</p>
            </Banner>
            <button
              type="button"
              className="rounded-full border border-[#292823]/15 bg-white px-4 py-2 text-sm font-bold"
              onClick={() => templates.refetch()}
            >
              Reintentar
            </button>
          </div>
        )}
        {templates.data && templates.data.length === 0 && (
          <p className="text-sm">
            Todavía no hay plantillas en el gimnasio. Creá la primera para
            asignar rutinas sin depender de la generación.
          </p>
        )}
        {templates.data && templates.data.length > 0 && (
          <ul className="space-y-2">
            {templates.data.map((template) => (
              <li
                key={template.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#292823]/10 px-3 py-2"
              >
                <div className="space-y-1">
                  <p className="text-sm font-bold">{template.name}</p>
                  <p className="text-xs">
                    {template.routineType} · {template.dayCount} días ·{' '}
                    {template.exerciseCount} ejercicios
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-[#292823]/15 bg-white px-3 py-1 text-xs font-bold"
                    onClick={() => {
                      setNotice(null);
                      setMode({ view: 'edit', templateId: template.id });
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[#292823]/15 bg-white px-3 py-1 text-xs font-bold disabled:opacity-60"
                    disabled={
                      toggleActive.isPending && togglingId === template.id
                    }
                    onClick={() => {
                      setTogglingId(template.id);
                      toggleActive.mutate(
                        { templateId: template.id, active: false },
                        {
                          onSuccess: () => setNotice('Plantilla desactivada.'),
                        },
                      );
                    }}
                  >
                    Desactivar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {toggleActive.isError && (
          <p role="alert" className="text-coral-strong text-xs font-medium">
            {templateErrorMessage(toggleActive.error)}
          </p>
        )}
      </BentoCard>
      <p className="text-xs opacity-70">
        Las plantillas desactivadas no aparecen para asignar. Las rutinas ya
        creadas a partir de una plantilla no cambian cuando la editás.
      </p>
    </div>
  );
}
