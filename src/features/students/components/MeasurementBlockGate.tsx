import { Outlet } from 'react-router-dom';

import { Banner } from '../../../shared/components/Banner';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { useSession } from '../../auth/hooks/useSession';
import { RenewalMeasurementForm } from '../../routines/components/RenewalMeasurementForm';
import { useOwnMeasurementBlock } from '../hooks/useOwnMeasurementBlock';

export function MeasurementBlockGate() {
  const { user } = useSession();
  const status = useOwnMeasurementBlock();

  if (status.isPending) {
    return <PageHeader kicker="Estado de mediciones" title="Cargando…" />;
  }

  if (status.error || !status.data || !user) {
    return (
      <div>
        <PageHeader
          kicker="Estado de mediciones"
          title="No pudimos verificar tu acceso"
        />
        <main className="page-body">
          <Banner
            variant="danger"
            title="No pudimos consultar el estado de tus mediciones."
            actions={
              <button
                type="button"
                onClick={() => void status.refetch()}
                className="btn-primary btn-sm"
              >
                Reintentar
              </button>
            }
          />
        </main>
      </div>
    );
  }

  if (status.data.measurementBlockState === 'NORMAL') {
    return <Outlet />;
  }

  const awaitingApproval =
    status.data.measurementBlockState === 'PENDIENTE_APROBACION';

  return (
    <div>
      <PageHeader
        kicker="Regularización de mediciones"
        title={
          awaitingApproval
            ? 'Tu entrenador debe aprobar la carga.'
            : 'Actualizá tus mediciones para continuar.'
        }
        description="Alcanzaste tres ciclos consecutivos sin confirmar peso y altura. Tu cuenta sigue activa, pero las demás funciones de alumno permanecen restringidas."
      />
      <main className="page-body">
        <BentoCard className="max-w-2xl">
          {awaitingApproval ? (
            <Banner variant="info" title="Mediciones enviadas">
              <p>
                La carga quedó registrada. Recuperarás el acceso cuando tu
                entrenador vigente apruebe la regularización.
              </p>
            </Banner>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <p className="eyebrow text-[#77756d]">Medición pendiente</p>
                <p className="mt-2 text-sm text-[#68675f]">
                  Cargá ambos valores. La operación no te desbloquea de forma
                  automática: después deberá aprobarla tu entrenador.
                </p>
              </div>
              <RenewalMeasurementForm
                studentId={user.id}
                onRegistrada={() => void status.refetch()}
              />
            </div>
          )}
        </BentoCard>
      </main>
    </div>
  );
}
