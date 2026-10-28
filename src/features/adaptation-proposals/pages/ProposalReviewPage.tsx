import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import type { ProposalResolution } from '../../../api/proposals';
import { Banner } from '../../../shared/components/Banner';
import { formatDate, humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { AdjustmentEvidence } from '../components/AdjustmentEvidence';
import { OutdatedDataWarning } from '../components/OutdatedDataWarning';
import { StructureProposalView } from '../components/StructureProposalView';
import { useProposalReview } from '../hooks/useProposalReview';
import { useResolveProposal } from '../hooks/useResolveProposal';
import { useProposalRegeneration } from '../hooks/useProposalRegeneration';
import {
  adjustmentTypeLabel,
  formatAdjustmentValue,
  requiresManualIntervention,
} from '../lib/adjustments';

function loadErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return 'Propuesta no encontrada.';
  }
  if (error instanceof ApiError && error.status === 403) {
    return 'La propuesta es de un alumno que no está a tu cargo.';
  }
  return 'No pudimos cargar la propuesta.';
}

function resolutionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'proposal_not_pending':
        return 'La propuesta ya fue resuelta.';
      case 'proposal_regeneration_pending':
        return 'La nueva planilla se está generando. Esperá a que termine antes de decidir.';
      case 'proposal_candidate_changed':
        return 'La planilla cambió en otra sesión. Recargá la propuesta antes de decidir.';
      case 'generation_context_changed':
        return 'Cambió el contexto o la configuración del gimnasio. Regenerá la planilla antes de aprobarla.';
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

/**
 * Revisión de una propuesta de adaptación (HU04). La advertencia de datos
 * desactualizados queda visible antes de decidir (T2), y el entrenador puede
 * aprobar, aprobar parcialmente o rechazar (T3).
 */
export function ProposalReviewPage() {
  const { proposalId = '' } = useParams<{ proposalId: string }>();
  const review = useProposalReview(proposalId);
  const resolve = useResolveProposal(proposalId);
  const regeneration = useProposalRegeneration(
    proposalId,
    !!review.data?.regeneration && review.data.state === 'PENDIENTE',
  );
  const [feedback, setFeedback] = useState('');
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set());
  const [reason, setReason] = useState('');

  const backLink = (
    <Link to="/entrenador/rutinas/revisar" className="btn-secondary btn-sm">
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
  const manualAdjustments = proposal.adjustments.filter(
    requiresManualIntervention,
  );
  const hasManualAdjustments = manualAdjustments.length > 0;
  const canApprovePartially = accepted.size > 0 && accepted.size < total;
  const canReject = reason.trim().length > 0;
  const busy = resolve.isPending || regeneration.busy;
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

  return (
    <div>
      <PageHeader
        kicker="Revisión de propuesta"
        title={proposal.student.displayName}
        description={`${humanizeEnum(diagnostic.globalSituation)} · período ${formatDate(diagnostic.periodStart)} – ${formatDate(diagnostic.periodEnd)}${diagnostic.adherence !== null ? ` · adherencia ${diagnostic.adherence.toLocaleString('es-AR')} %` : ''}.`}
        actions={backLink}
      />
      <main className="page-body flex flex-col gap-4">
        <OutdatedDataWarning proposal={proposal.advertenciaDatos} />

        {resolve.data ? (
          <Banner variant="info" title={resolutionTitle(resolve.data)} />
        ) : null}

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            {pending && proposal.regeneration ? (
              <BentoCard>
                <p className="eyebrow text-[#77756d]">Regenerar con IA</p>
                <p className="mt-2 text-sm">
                  Si esta planilla no te convence, indicá qué querés cambiar. La
                  IA usará los ejercicios habilitados y los parámetros actuales
                  del gimnasio.
                </p>
                <label
                  htmlFor="regeneration-feedback"
                  className="field-label mt-4"
                >
                  Qué debería mejorar la nueva planilla
                </label>
                <textarea
                  id="regeneration-feedback"
                  value={feedback}
                  onChange={(event) => {
                    setFeedback(event.target.value);
                    regeneration.start.reset();
                  }}
                  maxLength={2000}
                  rows={3}
                  disabled={busy}
                  className="field mt-2"
                />
                {regeneration.status.data?.state === 'PENDIENTE' ? (
                  <p role="status" className="mt-3 text-sm">
                    La IA está generando otra planilla. Podés volver a esta
                    página; el proceso continuará.
                  </p>
                ) : null}
                {regeneration.status.data?.state === 'COMPLETADA' ? (
                  <p role="status" className="mt-3 text-sm">
                    La nueva planilla está lista para tu revisión.
                  </p>
                ) : null}
                {regeneration.status.data?.state === 'NO_DISPONIBLE' ? (
                  <p role="alert" className="field-error mt-3">
                    No se pudo regenerar: {regeneration.status.data.error} La
                    planilla anterior sigue disponible.
                  </p>
                ) : null}
                {regeneration.start.error ? (
                  <p role="alert" className="field-error mt-3">
                    No pudimos solicitar la regeneración. Si la planilla cambió
                    en otra sesión, recargá esta página.
                  </p>
                ) : null}
                {regeneration.status.error ? (
                  <div className="mt-3 text-sm">
                    <p role="alert">
                      No pudimos verificar el estado de la regeneración.
                    </p>
                    <button
                      type="button"
                      className="btn-secondary btn-sm mt-2"
                      onClick={() => void regeneration.status.refetch()}
                    >
                      Reintentar
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={busy || !feedback.trim()}
                  className="btn-secondary mt-4"
                  onClick={() =>
                    regeneration.start.mutate({
                      feedback: feedback.trim(),
                      candidateRequestId:
                        proposal.regeneration!.candidateRequestId,
                      idempotencyKey: crypto.randomUUID(),
                    })
                  }
                >
                  Regenerar planilla con IA
                </button>
              </BentoCard>
            ) : null}

            <BentoCard>
              <p className="eyebrow text-[#77756d]">
                Ajustes propuestos
                {proposal.routine
                  ? ` · ${humanizeEnum(proposal.routine.routineType)}, versión ${proposal.routine.currentVersionNumber ?? '—'}`
                  : ''}
              </p>
              {hasManualAdjustments ? (
                <Banner
                  variant="warning"
                  title="Hay ejercicios sin reemplazo automático"
                >
                  Elegí una alternativa compatible desde la rutina del alumno y
                  luego resolvé esta propuesta. La propuesta permanece pendiente
                  para que no se pierda la intervención.
                </Banner>
              ) : null}
              <ul className="mt-4 divide-y divide-[#292823]/8">
                {proposal.adjustments.map((adjustment) => {
                  const label = `${adjustmentTypeLabel(adjustment.type)} · ${adjustment.exerciseName ?? 'Rutina completa'}`;
                  const manual = requiresManualIntervention(adjustment);
                  return (
                    <li key={adjustment.id} className="flex gap-3 py-3">
                      {pending && !manual ? (
                        <input
                          type="checkbox"
                          checked={accepted.has(adjustment.id)}
                          onChange={() => toggle(adjustment.id)}
                          aria-label={`Aceptar ${label}`}
                          className="check mt-0.5"
                        />
                      ) : null}
                      <div className="flex-1">
                        <p className="text-xs font-bold">{label}</p>
                        <p className="mt-1 text-xs">
                          {formatAdjustmentValue(
                            adjustment.type,
                            adjustment.previousValue,
                          )}{' '}
                          →{' '}
                          <strong>
                            {formatAdjustmentValue(
                              adjustment.type,
                              adjustment.proposedValue,
                            )}
                          </strong>
                        </p>
                        <AdjustmentEvidence
                          type={adjustment.type}
                          criterion={adjustment.criterion}
                          supportingData={adjustment.supportingData}
                        />
                        {manual ? (
                          <Link
                            to={`/entrenador/alumnos/${proposal.student.id}/rutina`}
                            className="btn-secondary btn-sm mt-3 inline-flex"
                          >
                            Editar rutina manualmente
                          </Link>
                        ) : null}
                        {adjustment.type === 'ESTRUCTURA' ? (
                          <StructureProposalView
                            value={adjustment.proposedValue}
                            evidence={adjustment.supportingData}
                          />
                        ) : null}
                      </div>
                      {!pending ? (
                        <span className="chip-neutral self-start">
                          {humanizeEnum(adjustment.state)}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </BentoCard>
          </div>

          <div className="lg:sticky lg:top-24">
            {pending ? (
              <BentoCard>
                <p className="eyebrow text-[#77756d]">
                  Decisión del entrenador
                </p>
                <p className="mt-2 text-xs text-[#77756d]">
                  Aprobar genera una versión nueva de la rutina y conserva la
                  anterior. Para aprobar parcialmente, marcá los ajustes que
                  aceptás.
                </p>
                <label htmlFor="motivo-resolucion" className="field-label mt-4">
                  Motivo (obligatorio para rechazar)
                </label>
                <textarea
                  id="motivo-resolucion"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={2}
                  maxLength={1000}
                  className="field mt-2"
                />
                {resolve.error ? (
                  <p className="field-error mt-3">
                    {resolutionErrorMessage(resolve.error)}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || hasManualAdjustments}
                    onClick={() =>
                      resolve.mutate({
                        decision: 'ACEPTADA_TOTAL',
                        candidateRequestId:
                          proposal.regeneration?.candidateRequestId,
                        reason: optionalReason,
                      })
                    }
                    className="btn-primary"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    disabled={busy || !canApprovePartially}
                    onClick={() =>
                      resolve.mutate({
                        decision: 'ACEPTADA_PARCIAL',
                        candidateRequestId:
                          proposal.regeneration?.candidateRequestId,
                        acceptedAdjustmentIds: [...accepted],
                        reason: optionalReason,
                      })
                    }
                    className="btn-secondary"
                  >
                    Aprobar parcialmente
                  </button>
                  <button
                    type="button"
                    disabled={busy || !canReject}
                    onClick={() =>
                      resolve.mutate({
                        decision: 'RECHAZADA',
                        candidateRequestId:
                          proposal.regeneration?.candidateRequestId,
                        reason: reason.trim(),
                      })
                    }
                    className="btn-danger"
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
          </div>
        </div>
      </main>
    </div>
  );
}
