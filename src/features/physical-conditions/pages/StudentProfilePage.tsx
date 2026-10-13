import { PageHeader } from '../../../shared/ui/PageHeader';
import { StudentConditionsPanel } from '../components/StudentConditionsPanel';

/** Perfil del alumno: por ahora, sus condiciones físicas (HU11). */
export function StudentProfilePage({ studentId }: { studentId: string }) {
  return (
    <div>
      <PageHeader
        kicker="Mi perfil"
        title="Tus datos de entrenamiento."
        description="Lo que declares acá lo ve tu entrenador para cuidar tu rutina."
      />
      <main className="max-w-3xl px-4 pb-10 sm:px-7 lg:px-9">
        <StudentConditionsPanel studentId={studentId} />
      </main>
    </div>
  );
}
