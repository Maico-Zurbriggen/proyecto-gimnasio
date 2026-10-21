import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import { Banner } from '../../../shared/components/Banner';
import { formatDate, humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { RoutineChangeRequestPanel } from '../../routine-generations/components/RoutineChangeRequestPanel';
import { RoutineContentView } from '../components/RoutineContentView';
import { RoutineReviewForm } from '../components/RoutineReviewForm';
import {
  usePendingRoutineReviews,
  useReviewRoutine,
  useRoutineContent,
} from '../hooks/usePrescriptions';
import { originLabel } from '../lib/origin';

const VOLVER = '/entrenador/rutinas/revisar';

/**
 * Revisión de una rutina propuesta desde la bandeja (HU17, FL-02).
 *
 * Muestra el contenido completo y el contexto que la bandeja ya conoce —quién
 * la originó, si reemplaza a una vigente, si choca con el objetivo— y registra
 * la decisión. Una vez decidida, la pantalla confirma el resultado en lugar de
 * volver a ofrecer los botones.
 */
export function RoutineReviewPage() {
  const { studentId = '', routineId = '' } = useParams<{
    studentId: string;
    routineId: string;
  }>();
  const navigate = useNavigate();
  // Al aplicar un cambio la rutina original pasa a DESCARTADA antes de navegar
  // a la nueva: el panel debe seguir montado hasta entonces.
  const [changePanel, setChangePanel] = useState(false);
  const content = useRoutineContent(studentId, routineId);
  const pending = usePendingRoutineReviews();
  const review = useReviewRoutine(studentId);
  useEffect(() => {
    if (content.data?.state === 'PROPUESTA') setChangePanel(true);
  }, [content.data?.state]);
  const resumen = pending.data?.find((item) => item.routineId === routineId);

  if (review.isSuccess) {
    const aprobada = review.data.state === 'VIGENTE';
    return (
      <div>
        <PageHeader kicker="Bandeja de rutinas" title="Decisión registrada." />
        <main className="page-body flex max-w-2xl flex-col gap-4">
          <Banner
            variant="info"
            title={aprobada ? 'Rutina aprobada' : 'Rutina rechazada'}
          >
            <p>
              {aprobada
                ? 'Ya rige para el alumno y le avisamos.'
                : 'El alumno recibió el motivo y su rutina vigente, si tenía, sigue igual.'}
              {review.data.archivedRoutineId
                ? ' La rutina anterior quedó archivada.'
                : ''}
            </p>
          </Banner>
          <Link to={VOLVER} className="btn-primary self-start">
            Volver a la bandeja
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        kicker="Bandeja de rutinas"
        title={resumen ? resumen.studentName : 'Rutina propuesta'}
        description={
          resumen
            ? `${humanizeEnum(resumen.routineType)} · ${String(resumen.targetWeeklyFrequency)} días por semana · ${originLabel(resumen)} el ${formatDate(resumen.requestedAt)}.`
            : undefined
        }
      />
      <main className="page-body grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <BentoCard>
          <p className="eyebrow text-[#5f5d55]">Contenido</p>
          {content.isPending ? (
            <p role="status" className="mt-4 text-sm text-[#5f5d55]">
              Cargando la rutina…
            </p>
          ) : content.isError ? (
            <div role="alert" className="mt-4 flex flex-col items-start gap-3">
              <p className="text-sm">
                {content.error instanceof ApiError &&
                content.error.status === 404
                  ? 'La rutina no existe o ya no está en tu cartera.'
                  : 'No pudimos cargar la rutina.'}
              </p>
              <button
                type="button"
                onClick={() => void content.refetch()}
                className="btn-secondary btn-sm"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="mt-4">
              {content.data.generationPrompt ? (
                <p className="mb-3 surface-muted text-xs text-[#55534c]">
                  <span className="font-bold">Pedido original: </span>
                  {content.data.generationPrompt}
                </p>
              ) : null}
              <RoutineContentView routine={content.data} />
            </div>
          )}
        </BentoCard>

        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <BentoCard className="flex flex-col gap-4">
            <div>
              <p className="eyebrow text-[#5f5d55]">Decisión</p>
              {content.data && content.data.state !== 'PROPUESTA' ? (
                <p className="mt-3 text-sm">
                  Esta rutina ya no está pendiente: su estado es{' '}
                  <strong>{humanizeEnum(content.data.state)}</strong>.
                </p>
              ) : null}
              {resumen?.replacesActiveRoutine ? (
                <p className="mt-3 text-xs text-[#55534c]">
                  <span aria-hidden="true">↻ </span>
                  El alumno tiene una rutina vigente: si aprobás ésta, la
                  anterior se archiva.
                </p>
              ) : null}
            </div>

            {content.data?.state === 'PROPUESTA' ? (
              <RoutineReviewForm
                goalMismatch={resumen?.goalMismatch}
                pending={review.isPending}
                error={review.error}
                onDecide={(decision) => {
                  review.mutate({
                    routineId,
                    reviewToken: content.data?.reviewToken,
                    ...decision,
                  });
                }}
              />
            ) : null}

            <Link to={VOLVER} className="btn-ghost btn-sm self-start">
              Volver a la bandeja
            </Link>
          </BentoCard>
          {changePanel ? (
            <RoutineChangeRequestPanel
              studentId={studentId}
              esEntrenador
              onApplied={(newRoutineId) => {
                void navigate(
                  `/entrenador/rutinas/propuestas/${studentId}/${newRoutineId}`,
                  { replace: true },
                );
              }}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
