import { Link, useParams } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import { Banner } from '../../../shared/components/Banner';
import { formatDate, humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
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
  const content = useRoutineContent(studentId, routineId);
  const pending = usePendingRoutineReviews();
  const review = useReviewRoutine(studentId);
  const resumen = pending.data?.find((item) => item.routineId === routineId);

  if (review.isSuccess) {
    const aprobada = review.data.state === 'VIGENTE';
    return (
      <div>
        <PageHeader kicker="Bandeja de rutinas" title="Decisión registrada." />
        <main className="flex max-w-2xl flex-col gap-4 px-4 pb-10 sm:px-7 lg:px-9">
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
          <Link
            to={VOLVER}
            className="bg-graphite self-start rounded-full px-4 py-2.5 text-sm font-bold text-white"
          >
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
      <main className="grid gap-4 px-4 pb-10 sm:px-7 lg:grid-cols-12 lg:px-9">
        <BentoCard className="lg:col-span-7">
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
                className="bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="mt-4">
              {content.data.generationPrompt ? (
                <p className="mb-3 rounded-xl bg-[#f4f3ee] p-3 text-xs text-[#55534c]">
                  <span className="font-bold">Pedido original: </span>
                  {content.data.generationPrompt}
                </p>
              ) : null}
              <RoutineContentView routine={content.data} />
            </div>
          )}
        </BentoCard>

        <BentoCard className="flex flex-col gap-4 lg:col-span-5">
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
                El alumno tiene una rutina vigente: si aprobás ésta, la anterior
                se archiva.
              </p>
            ) : null}
          </div>

          {content.data?.state === 'PROPUESTA' ? (
            <RoutineReviewForm
              goalMismatch={resumen?.goalMismatch}
              pending={review.isPending}
              error={review.error}
              onDecide={(decision) => {
                review.mutate({ routineId, ...decision });
              }}
            />
          ) : null}

          <Link
            to={VOLVER}
            className="text-sm font-bold text-[#3d3c36] underline underline-offset-2"
          >
            Volver a la bandeja
          </Link>
        </BentoCard>
      </main>
    </div>
  );
}
