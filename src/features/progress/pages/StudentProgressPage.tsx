import { PageHeader } from '../../../shared/ui/PageHeader';
import { AdherenceCard } from '../components/AdherenceCard';
import { MuscleActivityCard } from '../components/MuscleActivityCard';
import { SessionComplianceCard } from '../components/SessionComplianceCard';

export interface StudentProgressPageProps {
  studentId: string;
}

/**
 * Pantalla de Progreso del alumno (HU34 - T1, T2, T3).
 * Muestra adherencia sobre la ventana móvil de 4 semanas, cumplimiento
 * de la última sesión y distribución de volumen y frecuencia por grupo
 * muscular en el período seleccionado, usando InsufficientInfo cuando
 * no hay datos suficientes para evitar ceros engañosos o gráficos vacíos.
 */
export function StudentProgressPage({ studentId }: StudentProgressPageProps) {
  return (
    <div>
      <PageHeader
        kicker="Progreso"
        title="Mi progreso"
        description="Adherencia a la rutina, cumplimiento de sesiones y volumen por grupo muscular."
      />
      <main className="page-body space-y-6">
        {/* Fila superior: Adherencia y Cumplimiento de última sesión (HU34 T1) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AdherenceCard studentId={studentId} />
          <SessionComplianceCard studentId={studentId} />
        </div>

        {/* Fila principal: Volumen y frecuencia por grupo muscular (HU34 T2) */}
        <div className="grid grid-cols-1 gap-5">
          <MuscleActivityCard studentId={studentId} />
        </div>
      </main>
    </div>
  );
}
