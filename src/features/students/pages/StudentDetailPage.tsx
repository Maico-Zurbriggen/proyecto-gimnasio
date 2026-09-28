import { Link, useParams } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import { Banner } from '../../../shared/components/Banner';
import { formatDate } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SectionTabs } from '../../../shared/ui/SectionTabs';
import { RoutinePrescriptionPanel } from '../../prescriptions/components/RoutinePrescriptionPanel';
import { ActiveRoutineCard } from '../components/ActiveRoutineCard';
import { UnlockPanel } from '../components/UnlockPanel';
import { useStudentStatus } from '../hooks/useStudentStatus';
import { useUnlockStudent } from '../hooks/useUnlockStudent';

const BACK_LINK_CLASS =
  'rounded-full border border-[#292823]/10 bg-white px-3 py-1 text-[11px] font-bold';

function loadErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return 'Este alumno no está asignado a tu cartera.';
  }
  if (error instanceof ApiError && error.status === 404) {
    return 'El alumno no existe.';
  }
  return 'No pudimos cargar la ficha del alumno.';
}

function unlockErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'pending_measurement_required':
        return 'El alumno todavía debe cargar peso y altura.';
      case 'measurement_block_already_resolved':
      case 'student_not_blocked':
        return 'El alumno ya no está bloqueado.';
      case 'forbidden_not_assigned':
        return 'No tenés asignado a este alumno.';
    }
  }
  return 'No se pudo desbloquear al alumno. Intentá de nuevo.';
}

/**
 * Ficha del alumno en la vista del entrenador (HU05-T2/T3/T4). El estado de
 * bloqueo, el desbloqueo (HU05-T1) y la rutina vigente vienen del backend.
 */
export function StudentDetailPage() {
  const { studentId = '' } = useParams<{ studentId: string }>();
  const status = useStudentStatus(studentId);
  const unlock = useUnlockStudent(studentId);

  const backLink = (
    <Link to="/entrenador/alumnos" className={BACK_LINK_CLASS}>
      Volver a cartera
    </Link>
  );

  if (status.isPending) {
    return (
      <div>
        <PageHeader kicker="Ficha de alumno" title="Cargando ficha…" />
      </div>
    );
  }

  if (status.error) {
    const retryable =
      !(status.error instanceof ApiError) || status.error.status >= 500;
    return (
      <div>
        <PageHeader
          kicker="Ficha de alumno"
          title="No se pudo abrir la ficha"
          actions={backLink}
        />
        <main className="px-4 pb-10 sm:px-7 lg:px-9">
          <Banner
            variant="danger"
            title={loadErrorMessage(status.error)}
            actions={
              retryable ? (
                <button
                  type="button"
                  onClick={() => void status.refetch()}
                  disabled={status.isFetching}
                  className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  Reintentar
                </button>
              ) : undefined
            }
          />
        </main>
      </div>
    );
  }

  const student = status.data;
  const lastMeasurement = student.fechaUltimaMedicion
    ? `última medición ${formatDate(student.fechaUltimaMedicion)}`
    : 'sin mediciones registradas';

  return (
    <div>
      <PageHeader
        kicker="Ficha de alumno"
        title={student.displayName}
        description={`${student.faltasConsecutivas} ${student.faltasConsecutivas === 1 ? 'falta consecutiva' : 'faltas consecutivas'} · ${lastMeasurement}.`}
        actions={backLink}
      />
      <main className="px-4 pb-10 sm:px-7 lg:px-9">
        <SectionTabs
          tabs={[
            {
              label: 'Resumen',
              to: `/entrenador/alumnos/${student.studentId}`,
              end: true,
            },
            {
              label: 'Rutina',
              to: `/entrenador/alumnos/${student.studentId}/rutina`,
            },
            {
              label: 'Mediciones',
              to: `/entrenador/alumnos/${student.studentId}/mediciones`,
            },
          ]}
        />

        {unlock.isSuccess && !student.bloqueado ? (
          <div className="mb-4">
            <Banner variant="info" title="Alumno desbloqueado">
              <p>
                La regularización fue aprobada, la racha volvió a 0 y el alumno
                recuperó el acceso.
              </p>
            </Banner>
          </div>
        ) : null}

        {student.fechaUltimaMedicion === null ? (
          <div className="mb-4">
            <Banner variant="warning" title="Sin mediciones registradas">
              <p>
                Este alumno todavía no registró una medición corporal. Tenelo en
                cuenta antes de revisar o ajustar su rutina.
              </p>
            </Banner>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {student.bloqueado ? (
            <div className="xl:col-span-8">
              <UnlockPanel
                student={student}
                submitting={unlock.isPending}
                errorMessage={
                  unlock.error ? unlockErrorMessage(unlock.error) : null
                }
                onUnlock={() => unlock.mutate()}
              />
            </div>
          ) : (
            <BentoCard className="xl:col-span-8">
              <p className="eyebrow text-[#77756d]">Seguimiento</p>
              <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.06em]">
                Alumno sin bloqueo
              </h2>
              <p className="mt-4 text-xs text-[#77756d]">
                Faltas consecutivas: {student.faltasConsecutivas} · Altura:{' '}
                {student.alturaCm} cm · {lastMeasurement}.
              </p>
            </BentoCard>
          )}

          <ActiveRoutineCard
            studentUserId={student.studentId}
            routineHref={`/entrenador/alumnos/${student.studentId}/rutina`}
            className="xl:col-span-4"
          />
        </div>

        {!student.bloqueado ? (
          <>
            <RoutinePrescriptionPanel
              key={`prescripcion-${student.studentId}`}
              studentId={student.studentId}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}
