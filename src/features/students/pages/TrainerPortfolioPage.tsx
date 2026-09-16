import { CircleAlert, ClipboardCheck, UsersRound } from 'lucide-react';

import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { StatCard } from '../../../shared/ui/StatCard';
import { StudentList } from '../components/StudentList';
import { useTrainerStudents } from '../hooks/useTrainerStudents';

function attentionHeadline(blocked: number, proposals: number): string {
  if (blocked > 0) {
    return blocked === 1
      ? 'Un alumno bloqueado necesita que confirmes su desbloqueo.'
      : `${blocked} alumnos bloqueados necesitan que confirmes su desbloqueo.`;
  }
  if (proposals > 0) {
    return proposals === 1
      ? 'Una propuesta de adaptación espera tu revisión.'
      : `${proposals} propuestas de adaptación esperan tu revisión.`;
  }
  return 'Sin alertas urgentes en tu cartera.';
}

/** Cartera del entrenador con los alumnos a cargo, ordenados por urgencia. */
export function TrainerPortfolioPage() {
  const { data: students, isPending } = useTrainerStudents();
  const list = students ?? [];
  const blocked = list.filter((student) => student.bloqueado).length;
  const withRoutine = list.filter((student) => student.rutinaVigente).length;
  const proposals = list.reduce(
    (total, student) => total + student.propuestasPendientes,
    0,
  );

  return (
    <div>
      <PageHeader
        kicker="Cartera priorizada"
        title="Tus alumnos, por señal."
        description="Ordenados por urgencia de atención para que el seguimiento no dependa de memoria o mensajes aislados."
      />
      <main className="flex flex-col gap-4 px-4 pb-10 sm:px-7 lg:px-9">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
          <BentoCard tone="graphite" className="sm:col-span-2 xl:col-span-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-lime">Atención esta semana</p>
                <h2 className="font-display mt-3 max-w-[24rem] text-2xl font-semibold leading-tight tracking-[-0.05em]">
                  {isPending
                    ? 'Revisando tu cartera…'
                    : attentionHeadline(blocked, proposals)}
                </h2>
              </div>
              <CircleAlert className="size-5 shrink-0 text-lime" />
            </div>
          </BentoCard>
          <StatCard
            label="Alumnos a cargo"
            value={String(list.length)}
            detail={`${withRoutine} con rutina vigente`}
            icon={UsersRound}
            tone="lime"
            className="xl:col-span-3"
          />
          <StatCard
            label="Propuestas pendientes"
            value={String(proposals)}
            detail="esperan tu revisión"
            icon={ClipboardCheck}
            className="xl:col-span-3"
          />
        </div>

        <BentoCard>
          <p className="eyebrow text-[#77756d]">Cartera priorizada</p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.06em]">
            Próximas intervenciones
          </h2>
          <div className="mt-6">
            <StudentList />
          </div>
        </BentoCard>
      </main>
    </div>
  );
}
