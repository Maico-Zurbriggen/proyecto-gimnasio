import { CircleAlert, ClipboardCheck, UsersRound } from 'lucide-react';

import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { StatCard } from '../../../shared/ui/StatCard';
import { StudentList } from '../components/StudentList';
import { useTrainerStudents } from '../hooks/useTrainerStudents';
import { totalPendingReviews } from '../lib/pendingReviews';

function attentionHeadline(blocked: number, pendingReviews: number): string {
  if (blocked > 0) {
    return blocked === 1
      ? 'Un alumno bloqueado necesita que confirmes su desbloqueo.'
      : `${blocked} alumnos bloqueados necesitan que confirmes su desbloqueo.`;
  }
  if (pendingReviews > 0) {
    return pendingReviews === 1
      ? 'Una revisión pendiente necesita tu atención.'
      : `${pendingReviews} revisiones pendientes necesitan tu atención.`;
  }
  return 'Sin alertas urgentes en tu cartera.';
}

/** Cartera del entrenador con los alumnos a cargo, ordenados por urgencia. */
export function TrainerPortfolioPage() {
  const { data: students, isPending } = useTrainerStudents();
  const list = students ?? [];
  const blocked = list.filter((student) => student.bloqueado).length;
  const withRoutine = list.filter((student) => student.rutinaVigente).length;
  const pendingReviews = totalPendingReviews(list);

  return (
    <div>
      <PageHeader
        kicker="Cartera priorizada"
        title="Tus alumnos, por señal."
        description="Ordenados por urgencia de atención para que el seguimiento no dependa de memoria o mensajes aislados."
      />
      <main className="page-body flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-12">
          <BentoCard tone="graphite" className="sm:col-span-2 xl:col-span-6">
            <div className="flex h-full items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-lime">Atención esta semana</p>
                <h2 className="font-display mt-3 max-w-[26rem] text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                  {isPending
                    ? 'Revisando tu cartera…'
                    : attentionHeadline(blocked, pendingReviews)}
                </h2>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <CircleAlert className="size-5 text-lime" aria-hidden="true" />
              </span>
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
            label="Revisiones pendientes"
            value={String(pendingReviews)}
            detail="esperan tu revisión"
            icon={ClipboardCheck}
            className="xl:col-span-3"
          />
        </div>

        <BentoCard>
          <p className="eyebrow text-[#77756d]">Cartera priorizada</p>
          <h2 className="font-display mt-2 text-lg font-semibold tracking-tight">
            Próximas intervenciones
          </h2>
          <div className="mt-5">
            <StudentList />
          </div>
        </BentoCard>
      </main>
    </div>
  );
}
