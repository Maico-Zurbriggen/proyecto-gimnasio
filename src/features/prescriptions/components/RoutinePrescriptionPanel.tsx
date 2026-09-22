import { useState } from 'react';

import { ApiError } from '../../../api/client';
import type { RoutineSummary } from '../../../api/prescriptions';
import { Banner } from '../../../shared/components/Banner';
import { BentoCard } from '../../../shared/ui/BentoCard';
import {
  useAssignRoutine,
  useReviewRoutine,
  useRoutineContent,
  useRoutineTemplates,
  useStudentRoutines,
} from '../hooks/usePrescriptions';
import { RoutineContentView } from './RoutineContentView';

const SELECT_CLASS =
  'rounded-xl border border-[#292823]/15 bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-graphite';
const PRIMARY_BUTTON =
  'bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60';
const SECONDARY_BUTTON =
  'rounded-full border border-[#292823]/15 bg-white px-4 py-2 text-sm font-bold transition hover:brightness-95 disabled:opacity-60';

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'pending_proposal':
        return 'Ya hay una rutina propuesta sin resolver: aprobala o rechazala antes de asignar otra.';
      case 'template_from_another_gym':
        return 'Esa plantilla es de otro gimnasio.';
      case 'empty_template':
        return 'La plantilla no tiene días con ejercicios.';
      case 'routine_not_reviewable':
        return 'Esa rutina ya fue resuelta.';
      case 'forbidden_not_assigned':
        return 'No tenés asignado a este alumno.';
    }
  }
  return 'No pudimos completar la operación. Intentá de nuevo en un momento.';
}

export interface RoutinePrescriptionPanelProps {
  studentId: string;
}

/**
 * Prescripción de la rutina desde la ficha del alumno (RF-022, RF-110).
 *
 * Dos pasos deliberadamente separados: asignar una plantilla crea la rutina en
 * PROPUESTA, y recién la aprobación la pone en vigencia. Mientras haya una
 * propuesta sin resolver, no se puede asignar otra.
 */
export function RoutinePrescriptionPanel({
  studentId,
}: RoutinePrescriptionPanelProps) {
  const templates = useRoutineTemplates();
  const routines = useStudentRoutines(studentId);
  const assign = useAssignRoutine(studentId);
  const review = useReviewRoutine(studentId);

  const [templateId, setTemplateId] = useState('');
  const [observation, setObservation] = useState('');

  const lista: RoutineSummary[] = routines.data ?? [];
  const propuesta = lista.find((routine) => routine.state === 'PROPUESTA');
  const vigente = lista.find((routine) => routine.state === 'VIGENTE');
  const contenido = useRoutineContent(studentId, propuesta?.id);

  const seleccion = templateId || (templates.data?.[0]?.id ?? '');
  const operando = assign.isPending || review.isPending;
  const error = assign.error ?? review.error;

  return (
    <BentoCard className="mt-4 flex flex-col gap-4">
      <div>
        <p className="eyebrow text-[#77756d]">Prescripción</p>
        <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.06em]">
          Rutina del alumno
        </h2>
        <p className="mt-2 text-xs text-[#77756d]">
          {vigente
            ? `Rutina vigente: ${vigente.routineType.toLowerCase()} · ${String(vigente.targetWeeklyFrequency)} días por semana.`
            : 'El alumno todavía no tiene una rutina vigente.'}
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-coral-strong text-xs font-medium">
          {errorMessage(error)}
        </p>
      ) : null}

      {review.isSuccess && !propuesta ? (
        <Banner
          variant="info"
          title={
            review.data.state === 'VIGENTE'
              ? 'Rutina aprobada'
              : 'Rutina rechazada'
          }
        >
          <p>
            {review.data.state === 'VIGENTE'
              ? 'Ya rige para el alumno y la ve en su aplicación.'
              : 'Queda registrada como rechazada y el alumno no la ve.'}
            {review.data.archivedRoutineId
              ? ' La rutina anterior quedó archivada.'
              : ''}
          </p>
        </Banner>
      ) : null}

      {propuesta ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow rounded-full bg-[#fdf3e0] px-2.5 py-1 text-[#5a3d0c]">
              Propuesta sin resolver
            </span>
            <span className="text-xs font-medium text-[#77756d]">
              {propuesta.routineType.toLowerCase()} ·{' '}
              {String(propuesta.targetWeeklyFrequency)} días · versión{' '}
              {String(propuesta.versionNumber)}
            </span>
          </div>

          {contenido.isLoading ? (
            <p className="text-xs text-[#77756d]">Cargando la propuesta…</p>
          ) : null}
          {contenido.data ? (
            <RoutineContentView routine={contenido.data} />
          ) : null}

          <label className="flex flex-col gap-1.5">
            <span className="eyebrow text-[#77756d]">
              Observación (opcional)
            </span>
            <input
              type="text"
              value={observation}
              maxLength={500}
              onChange={(event) => setObservation(event.target.value)}
              className={SELECT_CLASS}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={operando}
              className={PRIMARY_BUTTON}
              onClick={() => {
                review.mutate({
                  routineId: propuesta.id,
                  result: 'APROBADA',
                  observation: observation || undefined,
                });
              }}
            >
              {review.isPending ? 'Aplicando…' : 'Aprobar y poner en vigencia'}
            </button>
            <button
              type="button"
              disabled={operando}
              className={SECONDARY_BUTTON}
              onClick={() => {
                review.mutate({
                  routineId: propuesta.id,
                  result: 'RECHAZADA',
                  observation: observation || undefined,
                });
              }}
            >
              Rechazar
            </button>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow text-[#77756d]">
              Plantilla para asignar
            </span>
            <select
              value={seleccion}
              disabled={templates.isLoading || operando}
              onChange={(event) => setTemplateId(event.target.value)}
              className={SELECT_CLASS}
            >
              {(templates.data ?? []).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · {String(template.dayCount)} días ·{' '}
                  {String(template.exerciseCount)} ejercicios
                </option>
              ))}
            </select>
          </label>

          {templates.data?.length === 0 ? (
            <p className="text-xs text-[#77756d]">
              No hay plantillas activas en el gimnasio.
            </p>
          ) : null}

          <button
            type="button"
            disabled={!seleccion || operando}
            className={`${PRIMARY_BUTTON} self-start`}
            onClick={() => {
              assign.mutate(seleccion);
            }}
          >
            {assign.isPending ? 'Asignando…' : 'Asignar como propuesta'}
          </button>
          <p className="text-xs text-[#77756d]">
            La plantilla se copia para este alumno. Nada rige hasta que la
            apruebes.
          </p>
        </section>
      )}
    </BentoCard>
  );
}
