import { Activity, CircleAlert, UsersRound } from 'lucide-react';

import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { StatCard } from '../../../shared/ui/StatCard';
import { StudentRow } from '../components/StudentRow';
import { MOCK_STUDENTS } from '../data/mockStudents';

/**
 * Cartera del entrenador. La fila de Juan Pérez (bloqueado) lleva a la
 * ficha real de HU05; el resto de los módulos son de referencia visual.
 */
export function TrainerPortfolioPage() {
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
                  Un alumno bloqueado necesita que confirmes su desbloqueo.
                </h2>
              </div>
              <CircleAlert className="size-5 shrink-0 text-lime" />
            </div>
          </BentoCard>
          <StatCard
            label="Alumnos activos"
            value="24"
            detail="21 con rutina vigente"
            icon={UsersRound}
            tone="lime"
            className="xl:col-span-3"
          />
          <StatCard
            label="Adherencia media"
            value="76%"
            detail="últimas cuatro semanas"
            icon={Activity}
            className="xl:col-span-3"
          />
        </div>

        <BentoCard>
          <p className="eyebrow text-[#77756d]">Cartera priorizada</p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.06em]">
            Próximas intervenciones
          </h2>
          <div className="mt-6 space-y-2">
            {MOCK_STUDENTS.map((student) => (
              <StudentRow key={student.id} student={student} />
            ))}
          </div>
        </BentoCard>
      </main>
    </div>
  );
}
