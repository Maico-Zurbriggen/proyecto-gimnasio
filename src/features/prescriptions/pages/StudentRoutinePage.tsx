import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { useSession } from '../../auth/hooks/useSession';
import { RoutineContentView } from '../components/RoutineContentView';
import {
  useRoutineContent,
  useStudentRoutines,
} from '../hooks/usePrescriptions';

const TIPOS: Record<string, string> = {
  FUERZA: 'Fuerza',
  HIPERTROFIA: 'Hipertrofia',
  RESISTENCIA_MUSCULAR: 'Resistencia muscular',
  ACONDICIONAMIENTO_GENERAL: 'Acondicionamiento general',
};

/**
 * Rutina del alumno autenticado (RF-026).
 *
 * Muestra sólo la vigente: una propuesta sin aprobar no existe para el alumno,
 * que es lo que exige la puerta del entrenador de RF-110.
 */
export function StudentRoutinePage() {
  const { user } = useSession();
  const studentId = user?.id ?? '';
  const routines = useStudentRoutines(studentId);

  const vigente = (routines.data ?? []).find(
    (routine) => routine.state === 'VIGENTE',
  );
  const contenido = useRoutineContent(studentId, vigente?.id);

  const descripcion = vigente
    ? `${TIPOS[vigente.routineType] ?? vigente.routineType} · ${String(vigente.targetWeeklyFrequency)} días por semana · versión ${String(vigente.versionNumber)}`
    : undefined;

  return (
    <div>
      <PageHeader
        kicker="Mi rutina"
        title={
          vigente ? (TIPOS[vigente.routineType] ?? 'Mi rutina') : 'Mi rutina'
        }
        description={descripcion}
      />
      <main className="px-4 pb-10 sm:px-7 lg:px-9">
        {routines.isLoading ? (
          <p role="status" className="text-sm text-[#77756d]">
            Cargando tu rutina…
          </p>
        ) : null}

        {routines.isError ? (
          <BentoCard>
            <p className="text-coral-strong text-sm font-medium">
              No pudimos cargar tu rutina. Probá de nuevo en un momento.
            </p>
          </BentoCard>
        ) : null}

        {!routines.isLoading && !routines.isError && !vigente ? (
          <BentoCard>
            <p className="eyebrow text-[#77756d]">Todavía no hay nada acá</p>
            <h2 className="font-display mt-2 text-xl font-semibold tracking-[-0.04em]">
              No tenés una rutina vigente
            </h2>
            <p className="mt-2 text-sm text-[#55534c]">
              Cuando tu entrenador te asigne una y la apruebe, la vas a ver en
              esta pantalla con sus días, ejercicios y series.
            </p>
          </BentoCard>
        ) : null}

        {contenido.data ? (
          <RoutineContentView routine={contenido.data} />
        ) : null}
      </main>
    </div>
  );
}
