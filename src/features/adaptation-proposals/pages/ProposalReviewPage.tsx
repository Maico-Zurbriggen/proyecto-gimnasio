import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import type { ProposalResolution } from '../../../api/proposals';
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
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set());
  const [reason, setReason] = useState('');

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
              return (
                <li key={adjustment.id} className="flex gap-3 py-3">
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
                    <p className="mt-1 text-[11px] text-[#77756d]">
                      {adjustment.criterion}
                    </p>
                  </div>
                  {!pending ? (
                    <span className="self-start rounded-full bg-[#f0efe8] px-2 py-1 text-[10px] font-bold">
                      {humanizeEnum(adjustment.state)}
                    </span>
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
