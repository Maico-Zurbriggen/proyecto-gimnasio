import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { isApiError } from '../../../api/client';
import type {
  ProposalAdjustment,
  ProposalResolution,
} from '../../../api/proposals';
import { Banner } from '../../../shared/components/Banner';
import { formatDate, humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { OutdatedDataWarning } from '../components/OutdatedDataWarning';
import { useProposalReview } from '../hooks/useProposalReview';
import { useResolveProposal } from '../hooks/useResolveProposal';
import { adjustmentTypeLabel, formatAdjustmentValue } from '../lib/adjustments';

const BACK_LINK_CLASS =
  'rounded-full border border-[#292823]/10 bg-white px-3 py-1 text-[11px] font-bold';
const PRIMARY_BUTTON =
  'rounded-full bg-lime px-4 py-2.5 text-xs font-bold text-graphite transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#e4e2d8] disabled:text-[#9a988e] disabled:hover:brightness-100';
const SECONDARY_BUTTON =
  'rounded-full border border-[#292823]/15 bg-white px-4 py-2.5 text-xs font-bold text-ink transition hover:bg-[#faf9f4] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#e4e2d8] disabled:text-[#9a988e]';

function loadErrorMessage(error: unknown): string {
  if (isApiError(error) && error.status === 404) {
    return 'Propuesta no encontrada.';
  }
  if (isApiError(error) && error.status === 403) {
    return 'La propuesta es de un alumno que no está a tu cargo.';
  }
  return 'No pudimos cargar la propuesta.';
}

function resolutionErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    switch (error.code) {
      case 'proposal_not_pending':
        return 'La propuesta ya fue resuelta.';
      case 'adjustment_not_applicable':
        return 'Uno de los ajustes aceptados no se puede aplicar a la rutina actual.';
      case 'routine_not_available':
        return 'La rutina del alumno ya no tiene una versión vigente.';
      case 'invalid_resolution':
        return 'La decisión no es válida: revisá los ajustes marcados o el motivo.';
      case 'forbidden_not_assigned':
        return 'El alumno no está a tu cargo.';
    }
  }
  return 'No se pudo registrar la decisión. Intentá de nuevo.';
}

function resolutionTitle(resolution: ProposalResolution): string {
  if (resolution.state === 'RECHAZADA') {
    return 'Propuesta rechazada. El motivo quedó registrado.';
  }
  return `Propuesta aprobada: se creó la versión ${resolution.resultingVersionNumber} de la rutina.`;
}

interface ModifiedAdjustment {
  proposedValue: unknown;
  criterion?: string;
}

/**
 * Revisión de una propuesta de adaptación (HU04). La advertencia de datos
 * desactualizados queda visible antes de decidir (T2), y el entrenador puede
 * revisar, modificar ajustes individualmente, aprobar, aprobar parcialmente o rechazar (T3).
 */
export function ProposalReviewPage() {
  const { proposalId = '' } = useParams<{ proposalId: string }>();
  const review = useProposalReview(proposalId);
  const resolve = useResolveProposal(proposalId);
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set());
  const [reason, setReason] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modifiedAdjustments, setModifiedAdjustments] = useState<
    Record<string, ModifiedAdjustment>
  >({});
  const [editCarga, setEditCarga] = useState<string>('');
  const [editMinReps, setEditMinReps] = useState<string>('');
  const [editMaxReps, setEditMaxReps] = useState<string>('');
  const [editSeries, setEditSeries] = useState<string>('');
  const [editExerciseName, setEditExerciseName] = useState<string>('');
  const [editCriterion, setEditCriterion] = useState<string>('');

  const backLink = (
    <Link to="/entrenador/rutinas/revisar" className={BACK_LINK_CLASS}>
      Volver a propuestas
    </Link>
  );

  if (review.isPending) {
    return (
      <div>
        <PageHeader
          kicker="Revisión de propuesta"
          title="Cargando propuesta…"
        />
      </div>
    );
  }

  if (review.error) {
    return (
      <div>
        <PageHeader
          kicker="Revisión de propuesta"
          title={loadErrorMessage(review.error)}
          actions={backLink}
        />
      </div>
    );
  }

  const proposal = review.data;
  const pending = proposal.state === 'PENDIENTE';
  const total = proposal.adjustments.length;
  const canApprovePartially = accepted.size > 0 && accepted.size < total;
  const canReject = reason.trim().length > 0;
  const busy = resolve.isPending;
  const optionalReason = reason.trim() ? reason.trim() : undefined;
  const { diagnostic } = proposal;

  const toggle = (id: string) =>
    setAccepted((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const startEdit = (adjustment: ProposalAdjustment) => {
    setEditingId(adjustment.id);
    const mod = modifiedAdjustments[adjustment.id];
    const val = mod?.proposedValue ?? adjustment.proposedValue;
    setEditCriterion(mod?.criterion ?? adjustment.criterion);

    if (adjustment.type === 'CARGA') {
      const load =
        typeof val === 'object' && val !== null && 'carga_sugerida' in val
          ? (val as { carga_sugerida: number }).carga_sugerida
          : 60;
      setEditCarga(String(load));
    } else if (adjustment.type === 'ESQUEMA') {
      const min =
        typeof val === 'object' && val !== null && 'min_repetitions' in val
          ? (val as { min_repetitions: number }).min_repetitions
          : 4;
      const max =
        typeof val === 'object' && val !== null && 'max_repetitions' in val
          ? (val as { max_repetitions: number }).max_repetitions
          : 6;
      setEditMinReps(String(min));
      setEditMaxReps(String(max));
    } else if (adjustment.type === 'VOLUMEN') {
      const sets =
        typeof val === 'object' && val !== null && 'series_trabajo' in val
          ? (val as { series_trabajo: number }).series_trabajo
          : 4;
      setEditSeries(String(sets));
    } else if (adjustment.type === 'SUSTITUCION') {
      const name =
        typeof val === 'object' && val !== null && 'exercise_name' in val
          ? (val as { exercise_name: string }).exercise_name
          : (adjustment.exerciseName ?? '');
      setEditExerciseName(String(name));
    }
  };

  const saveEdit = (adjustment: ProposalAdjustment) => {
    let newProposedValue: unknown = adjustment.proposedValue;
    if (adjustment.type === 'CARGA') {
      newProposedValue = { carga_sugerida: parseFloat(editCarga) || 0 };
    } else if (adjustment.type === 'ESQUEMA') {
      newProposedValue = {
        min_repetitions: parseInt(editMinReps, 10) || 4,
        max_repetitions: parseInt(editMaxReps, 10) || 6,
      };
    } else if (adjustment.type === 'VOLUMEN') {
      newProposedValue = { series_trabajo: parseInt(editSeries, 10) || 4 };
    } else if (adjustment.type === 'SUSTITUCION') {
      newProposedValue = { exercise_name: editExerciseName.trim() };
    }

    setModifiedAdjustments((prev) => ({
      ...prev,
      [adjustment.id]: {
        proposedValue: newProposedValue,
        criterion: editCriterion.trim() || adjustment.criterion,
      },
    }));

    // Auto-accept modified adjustment
    setAccepted((prev) => new Set([...prev, adjustment.id]));
    setEditingId(null);
  };

  const resetEdit = (id: string) => {
    setModifiedAdjustments((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div>
      <PageHeader
        kicker="Revisión de propuesta"
        title={proposal.student.displayName}
        description={`${humanizeEnum(diagnostic.globalSituation)} · período ${formatDate(diagnostic.periodStart)} – ${formatDate(diagnostic.periodEnd)}${diagnostic.adherence !== null ? ` · adherencia ${diagnostic.adherence.toLocaleString('es-AR')} %` : ''}.`}
        actions={backLink}
      />
      <main className="flex flex-col gap-4 px-4 pb-10 sm:px-7 lg:px-9">
        <OutdatedDataWarning proposal={proposal.advertenciaDatos} />

        {resolve.data ? (
          <Banner variant="info" title={resolutionTitle(resolve.data)} />
        ) : null}

        <BentoCard>
          <p className="eyebrow text-[#77756d]">
            Ajustes propuestos
            {proposal.routine
              ? ` · ${humanizeEnum(proposal.routine.routineType)}, versión ${proposal.routine.currentVersionNumber ?? '—'}`
              : ''}
          </p>
          <ul className="mt-4 divide-y divide-[#292823]/8">
            {proposal.adjustments.map((adjustment) => {
              const label = `${adjustmentTypeLabel(adjustment.type)} · ${adjustment.exerciseName ?? 'Rutina completa'}`;
              const mod = modifiedAdjustments[adjustment.id];
              const effectiveProposedValue =
                mod?.proposedValue ?? adjustment.proposedValue;
              const effectiveCriterion = mod?.criterion ?? adjustment.criterion;
              const isEditing = editingId === adjustment.id;

              return (
                <li key={adjustment.id} className="py-3">
                  <div className="flex items-start gap-3">
                    {pending ? (
                      <input
                        type="checkbox"
                        checked={accepted.has(adjustment.id)}
                        onChange={() => toggle(adjustment.id)}
                        aria-label={`Aceptar ${label}`}
                        className="mt-0.5 size-4 accent-[#586d26]"
                      />
                    ) : null}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold">{label}</p>
                        {mod ? (
                          <span className="rounded-full bg-lime-soft px-2 py-0.5 text-[9px] font-bold text-[#526026]">
                            Modificado por entrenador
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs">
                        {formatAdjustmentValue(
                          adjustment.type,
                          adjustment.previousValue,
                        )}{' '}
                        →{' '}
                        <strong>
                          {formatAdjustmentValue(
                            adjustment.type,
                            effectiveProposedValue,
                          )}
                        </strong>
                      </p>
                      <p className="mt-1 text-[11px] text-[#77756d]">
                        {effectiveCriterion}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {pending && !isEditing ? (
                        <button
                          type="button"
                          onClick={() => startEdit(adjustment)}
                          className="rounded-full border border-[#292823]/10 bg-white px-2.5 py-1 text-[11px] font-bold text-graphite transition hover:bg-[#faf9f4]"
                        >
                          Modificar
                        </button>
                      ) : null}

                      {!pending ? (
                        <span className="self-start rounded-full bg-[#f0efe8] px-2 py-1 text-[10px] font-bold">
                          {humanizeEnum(adjustment.state)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Inline Edit Form */}
                  {isEditing ? (
                    <div className="mt-3 rounded-xl border border-[#292823]/10 bg-[#faf9f4] p-3.5">
                      <p className="eyebrow mb-2 text-[#77756d]">
                        Modificar prescripción para este ajuste
                      </p>

                      {adjustment.type === 'CARGA' && (
                        <label className="block">
                          <span className="text-xs font-bold text-ink">
                            Carga sugerida (kg)
                          </span>
                          <input
                            type="number"
                            step="0.5"
                            value={editCarga}
                            onChange={(e) => setEditCarga(e.target.value)}
                            className="mt-1 block w-40 rounded-lg border border-[#292823]/15 bg-white px-3 py-1.5 text-xs text-ink outline-none"
                          />
                        </label>
                      )}

                      {adjustment.type === 'ESQUEMA' && (
                        <div className="flex items-center gap-3">
                          <label>
                            <span className="text-xs font-bold text-ink">
                              Mínimo reps
                            </span>
                            <input
                              type="number"
                              value={editMinReps}
                              onChange={(e) => setEditMinReps(e.target.value)}
                              className="mt-1 block w-24 rounded-lg border border-[#292823]/15 bg-white px-3 py-1.5 text-xs text-ink outline-none"
                            />
                          </label>
                          <label>
                            <span className="text-xs font-bold text-ink">
                              Máximo reps
                            </span>
                            <input
                              type="number"
                              value={editMaxReps}
                              onChange={(e) => setEditMaxReps(e.target.value)}
                              className="mt-1 block w-24 rounded-lg border border-[#292823]/15 bg-white px-3 py-1.5 text-xs text-ink outline-none"
                            />
                          </label>
                        </div>
                      )}

                      {adjustment.type === 'VOLUMEN' && (
                        <label className="block">
                          <span className="text-xs font-bold text-ink">
                            Series de trabajo
                          </span>
                          <input
                            type="number"
                            value={editSeries}
                            onChange={(e) => setEditSeries(e.target.value)}
                            className="mt-1 block w-32 rounded-lg border border-[#292823]/15 bg-white px-3 py-1.5 text-xs text-ink outline-none"
                          />
                        </label>
                      )}

                      {adjustment.type === 'SUSTITUCION' && (
                        <label className="block">
                          <span className="text-xs font-bold text-ink">
                            Nombre del ejercicio de reemplazo
                          </span>
                          <input
                            type="text"
                            value={editExerciseName}
                            onChange={(e) =>
                              setEditExerciseName(e.target.value)
                            }
                            className="mt-1 block w-full rounded-lg border border-[#292823]/15 bg-white px-3 py-1.5 text-xs text-ink outline-none"
                          />
                        </label>
                      )}

                      <label className="mt-3 block">
                        <span className="text-xs font-bold text-ink">
                          Criterio o nota profesional (opcional)
                        </span>
                        <input
                          type="text"
                          value={editCriterion}
                          onChange={(e) => setEditCriterion(e.target.value)}
                          placeholder="Ej: Ajustado a tolerancia y feedback del alumno"
                          className="mt-1 block w-full rounded-lg border border-[#292823]/15 bg-white px-3 py-1.5 text-xs text-ink outline-none"
                        />
                      </label>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(adjustment)}
                          className="rounded-full bg-lime px-3 py-1 text-xs font-bold text-graphite transition hover:brightness-105"
                        >
                          Guardar cambio
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-full border border-[#292823]/15 bg-white px-3 py-1 text-xs font-bold text-[#68675f] transition hover:bg-[#faf9f4]"
                        >
                          Cancelar
                        </button>
                        {mod ? (
                          <button
                            type="button"
                            onClick={() => {
                              resetEdit(adjustment.id);
                              setEditingId(null);
                            }}
                            className="ml-auto text-[11px] text-[#77756d] underline hover:text-ink"
                          >
                            Restablecer sugerencia original
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </BentoCard>

        {pending ? (
          <BentoCard>
            <p className="eyebrow text-[#77756d]">Decisión del entrenador</p>
            <p className="mt-2 text-xs text-[#77756d]">
              Aprobar genera una versión nueva de la rutina y conserva la
              anterior. Para aprobar parcialmente, marcá los ajustes que
              aceptás.
            </p>
            <label
              htmlFor="motivo-resolucion"
              className="mt-4 block text-xs font-bold"
            >
              Motivo (obligatorio para rechazar)
            </label>
            <textarea
              id="motivo-resolucion"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              maxLength={1000}
              className="mt-2 w-full rounded-xl border border-[#292823]/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-graphite"
            />
            {resolve.error ? (
              <p className="mt-3 text-xs font-semibold text-[#7a2a20]">
                {resolutionErrorMessage(resolve.error)}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  resolve.mutate({
                    decision: 'ACEPTADA_TOTAL',
                    reason: optionalReason,
                    studentId: proposal.student.id,
                    modifiedAdjustments,
                  })
                }
                className={PRIMARY_BUTTON}
              >
                Aprobar
              </button>
              <button
                type="button"
                disabled={busy || !canApprovePartially}
                onClick={() =>
                  resolve.mutate({
                    decision: 'ACEPTADA_PARCIAL',
                    acceptedAdjustmentIds: [...accepted],
                    reason: optionalReason,
                    studentId: proposal.student.id,
                    modifiedAdjustments,
                  })
                }
                className={SECONDARY_BUTTON}
              >
                Aprobar parcialmente
              </button>
              <button
                type="button"
                disabled={busy || !canReject}
                onClick={() =>
                  resolve.mutate({
                    decision: 'RECHAZADA',
                    reason: reason.trim(),
                    studentId: proposal.student.id,
                  })
                }
                className={SECONDARY_BUTTON}
              >
                Rechazar
              </button>
            </div>
          </BentoCard>
        ) : (
          <BentoCard>
            <p className="eyebrow text-[#77756d]">Resolución</p>
            <p className="mt-3 text-sm font-semibold">
              {humanizeEnum(proposal.state)}
              {proposal.resolvedAt
                ? ` el ${formatDate(proposal.resolvedAt)}`
                : ''}
            </p>
            {proposal.resolutionReason ? (
              <p className="mt-1 text-xs text-[#77756d]">
                Motivo: {proposal.resolutionReason}
              </p>
            ) : null}
          </BentoCard>
        )}
      </main>
    </div>
  );
}
