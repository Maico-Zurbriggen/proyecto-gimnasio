import { InsufficientInfo } from '../../../shared/components/InsufficientInfo';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { GymSetupChecklist } from '../components/GymSetupChecklist';
import { PageHeader } from '../../../shared/ui/PageHeader';

/** Analítica del gimnasio. Vista de referencia visual, sin datos reales. */
export function AdminAnalyticsPage() {
  return (
    <div>
      <PageHeader
        kicker="Analítica del gimnasio"
        title="La salud de la comunidad."
        description="Indicadores agregados para anticipar deserción y acompañar la operación del gimnasio."
      />
      <main className="page-body">
        <GymSetupChecklist />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BentoCard className="sm:col-span-3">
            <InsufficientInfo
              missing="socios activos, actividad semanal y seguimiento"
              action="Indicadores aún no disponibles: se mostrarán cuando haya datos reales."
            />
          </BentoCard>
        </div>
      </main>
    </div>
  );
}
