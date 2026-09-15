import { Link, useParams } from 'react-router-dom';

import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SectionTabs } from '../../../shared/ui/SectionTabs';
import { ActiveRoutineCard } from '../components/ActiveRoutineCard';
import { UnlockPanel } from '../components/UnlockPanel';
import { findMockStudent } from '../data/mockStudents';

/**
 * Ficha del alumno en la vista del entrenador (HU05-T2/T3/T4). La rutina
 * vigente viene del backend; progreso y datos del alumno son de referencia
 * visual. El backend no expone todavía la operación de desbloqueo (HU05-T1):
 * acá se confirma la intención y se deja constancia por alerta.
 */
export function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const student = findMockStudent(studentId);

  if (!student) {
    return (
      <div>
        <PageHeader kicker="Ficha de alumno" title="Alumno no encontrado" />
        <main className="px-4 pb-10 sm:px-7 lg:px-9">
          <Link
            to="/entrenador/alumnos"
            className="text-xs font-bold text-[#586d26]"
          >
            Volver a la cartera
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        kicker="Ficha de alumno"
        title={student.name}
        description={`${student.goal} · última sesión ${student.lastSession}.`}
        actions={
          <Link
            to="/entrenador/alumnos"
            className="rounded-full border border-[#292823]/10 bg-white px-3 py-1 text-[11px] font-bold"
          >
            Volver a cartera
          </Link>
        }
      />
      <main className="px-4 pb-10 sm:px-7 lg:px-9">
        <SectionTabs
          tabs={[
            {
              label: 'Resumen',
              to: `/entrenador/alumnos/${student.id}`,
              end: true,
            },
            { label: 'Rutina', to: `/entrenador/alumnos/${student.id}/rutina` },
            {
              label: 'Mediciones',
              to: `/entrenador/alumnos/${student.id}/mediciones`,
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {student.bloqueado ? (
            <div className="xl:col-span-12">
              <UnlockPanel
                student={student}
                onUnlock={(measurement) => {
                  window.alert(
                    `Desbloqueo confirmado con peso ${measurement.weightKg}kg y altura ${measurement.heightCm}cm (endpoint real: fuera de alcance de esta tarea).`,
                  );
                }}
              />
            </div>
          ) : (
            <BentoCard className="xl:col-span-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow text-[#77756d]">Progreso reciente</p>
                  <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.06em]">
                    Sesiones en ritmo, fuerza arriba.
                  </h2>
                </div>
                <span className="rounded-full bg-lime-soft px-2.5 py-1 text-[10px] font-bold text-[#4a5b27]">
                  Adherencia {student.adherence}
                </span>
              </div>
              <p className="mt-6 text-xs text-[#8c897f]">
                Vista de referencia visual — sin datos reales en este sprint.
              </p>
            </BentoCard>
          )}

          <ActiveRoutineCard
            studentUserId={student.userId}
            routineHref={`/entrenador/alumnos/${student.id}/rutina`}
            className="xl:col-span-4"
          />
        </div>
      </main>
    </div>
  );
}
