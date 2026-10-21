import { Activity, CircleAlert, UsersRound } from 'lucide-react';

import { BentoCard } from '../../../shared/ui/BentoCard';
import { GymSetupChecklist } from '../components/GymSetupChecklist';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { StatCard } from '../../../shared/ui/StatCard';

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
          <StatCard
            label="Socios activos"
            value="182"
            detail="+8 respecto al mes anterior"
            icon={UsersRound}
            tone="graphite"
          />
          <StatCard
            label="Actividad semanal"
            value="74%"
            detail="con al menos una sesión"
            icon={Activity}
            tone="lime"
          />
          <StatCard
            label="En seguimiento"
            value="13"
            detail="señales de riesgo activas"
            icon={CircleAlert}
            tone="coral"
          />
          <BentoCard className="sm:col-span-3">
            <p className="eyebrow text-[#77756d]">Nota</p>
            <p className="mt-3 text-sm leading-6 text-[#68675f]">
              Este panel es de referencia visual. Sin funcionalidad real en este
              sprint.
            </p>
          </BentoCard>
        </div>
      </main>
    </div>
  );
}
