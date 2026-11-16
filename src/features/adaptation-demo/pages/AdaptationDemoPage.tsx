import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '../../../api/client';
import {
  listAdaptationDemoStudents,
  prepareAdaptationDemo,
  restoreAdaptationDemo,
} from '../../../api/adaptationDemo';
import type { AdaptationDemoScenario } from '../../../api/generated/adaptation-demo';
import { broadcastDataChange } from '../../../shared/lib/cross-window-data';
import { humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PageHeader } from '../../../shared/ui/PageHeader';

const queryKey = ['adaptation-demo', 'students'] as const;
const scenarios: {
  id: AdaptationDemoScenario;
  title: string;
  evidence: string;
  outcome: string;
}[] = [
  {
    id: 'ESTIMULO_INSUFICIENTE',
    title: 'Estímulo insuficiente',
    evidence: 'Tope de repeticiones, esfuerzo 4/10 y carga estable en 60 kg.',
    outcome: 'Propuesta de carga: 60 → 62,5 kg.',
  },
  {
    id: 'SOBREEXIGENCIA',
    title: 'Sobreexigencia',
    evidence:
      'Tres sesiones seguidas con cumplimiento menor al 70 % y esfuerzo 9/10.',
    outcome: 'Propuesta: reducir la carga y quitar una serie.',
  },
  {
    id: 'ESTANCAMIENTO_PRIMERO',
    title: 'Primer estancamiento',
    evidence: 'Carga máxima estimada estable y esfuerzo moderado.',
    outcome:
      'Propuesta de esquema y volumen, dentro de los límites del tipo de rutina.',
  },
  {
    id: 'ESTANCAMIENTO_SEGUNDO',
    title: 'Segundo estancamiento',
    evidence: 'Dos diagnósticos consecutivos de estancamiento.',
    outcome:
      'Propuesta de sustitución por una alternativa habilitada del catálogo.',
  },
  {
    id: 'PROGRESION_ADECUADA',
    title: 'Progresión adecuada',
    evidence: 'La carga máxima estimada mejora un 5 %.',
    outcome: 'Diagnóstico favorable, sin propuesta de ajuste.',
  },
  {
    id: 'DATOS_INSUFICIENTES',
    title: 'Datos insuficientes',
    evidence: 'Sólo tres sesiones de un día de la rutina.',
    outcome: 'Diagnóstico sin evidencia suficiente, sin propuesta.',
  },
];

function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError))
    return 'No pudimos completar la operación. Reintentá; la preparación se conserva en el servidor.';
  const messages: Record<string, string> = {
    adaptation_demo_disabled:
      'El panel está deshabilitado en este despliegue. Habilitá ADAPTATION_DEMO_ENABLED en el backend para usarlo.',
    forbidden_not_assigned:
      'Sólo podés preparar alumnos activos que tengas asignados en tu gimnasio.',
    forbidden_role: 'Este panel requiere una sesión de entrenador.',
    demo_current_routine_required:
      'El alumno necesita una rutina vigente con ejercicios. Asignale una antes de preparar el caso.',
    demo_alternative_required:
      'No hay una alternativa apta y habilitada para mostrar la sustitución. Habilitá una del mismo patrón, que no esté ya en la rutina, o elegí otro alumno.',
    demo_training_in_progress:
      'Hay una sesión de entrenamiento en curso. Finalizala antes de preparar o restaurar.',
    demo_incompatible_exercise:
      'La rutina contiene un ejercicio incompatible o desactivado. Revisala antes de preparar el caso.',
    routine_exercise_unavailable:
      'Un ejercicio de la rutina no está habilitado en el catálogo de este gimnasio.',
    demo_restore_conflict:
      'La rutina cambió desde la preparación. Revisá el alumno antes de restaurar para conservar esos cambios.',
    demo_has_new_training:
      'Se registró entrenamiento real durante la preparación. La restauración requiere revisar esos datos.',
    demo_regeneration_pending:
      'Hay una regeneración pendiente. Esperá a que termine antes de restaurar o cambiar de caso.',
    demo_routine_too_large:
      'El panel admite rutinas de hasta siete días y sesenta ejercicios.',
    demo_restore_point_invalid:
      'El punto de restauración necesita revisión técnica. No se modificaron los datos.',
  };
  return (
    messages[error.code] ??
    'No pudimos completar la operación. Revisá tu conexión y volvé a intentar.'
  );
}

/** Operator window; all history and diagnosis preparation happens in the authorized API. */
export function AdaptationDemoPage() {
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState('');
  const students = useQuery({
    queryKey,
    queryFn: ({ signal }) => listAdaptationDemoStudents(signal),
  });
  const selected =
    students.data?.find((student) => student.studentId === studentId) ??
    students.data?.[0];
  const refresh = async () => {
    broadcastDataChange();
    await queryClient.invalidateQueries();
  };
  const prepare = useMutation({
    mutationFn: ({
      id,
      scenario,
    }: {
      id: string;
      scenario: AdaptationDemoScenario;
    }) => prepareAdaptationDemo(id, scenario),
    onSuccess: refresh,
  });
  const restore = useMutation({
    mutationFn: restoreAdaptationDemo,
    onSuccess: refresh,
  });
  const busy = prepare.isPending || restore.isPending;
  const active = selected?.activeRun;
  const error = prepare.error ?? restore.error;

  return (
    <div className="min-h-screen bg-[#f4f3ed] pb-10">
      <PageHeader
        kicker="Preparación de la demo"
        title="Casos de adaptación."
        description="Elegí un alumno existente y prepará el caso. El diagnóstico y la propuesta se calculan con las reglas del sistema."
        actions={
          <a
            className="btn-secondary btn-sm"
            href="/entrenador/rutinas/revisar"
            target="vivaz-demo-app"
            rel="noopener noreferrer"
          >
            Abrir bandeja{' '}
            <ExternalLink className="ml-2 size-4" aria-hidden="true" />
          </a>
        }
      />
      <main className="page-body space-y-5">
        <BentoCard>
          <p className="text-sm leading-relaxed text-[#68675f]">
            La preparación usa el alumno y los ejercicios de esta muestra
            desplegada. Activa una rutina temporal con historial identificado
            como simulado; al restaurar, vuelve su rutina original. Los
            registros originales se conservan.
          </p>
          {students.isPending ? (
            <LoadingState label="Cargando alumnos asignados…" />
          ) : students.isError ? (
            <div className="mt-4">
              <p role="alert" className="field-error">
                {errorMessage(students.error)}
              </p>
              <button
                type="button"
                className="btn-secondary btn-sm mt-3"
                onClick={() => void students.refetch()}
                disabled={students.isFetching}
              >
                Reintentar
              </button>
            </div>
          ) : students.data.length === 0 ? (
            <p className="mt-4 text-sm">No tenés alumnos activos asignados.</p>
          ) : (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="demo-student"
                  className="mb-2 block text-sm font-semibold"
                >
                  Alumno de la muestra
                </label>
                <select
                  id="demo-student"
                  className="field w-full"
                  value={selected?.studentId ?? ''}
                  disabled={busy}
                  onChange={(event) => {
                    setStudentId(event.target.value);
                    prepare.reset();
                    restore.reset();
                  }}
                >
                  {students.data.map((student) => (
                    <option key={student.studentId} value={student.studentId}>
                      {student.displayName}
                      {student.activeRun ? ' · preparación activa' : ''}
                      {!student.hasCurrentRoutine
                        ? ' · sin rutina vigente'
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy || !active}
                onClick={() => {
                  prepare.reset();
                  restore.mutate(selected!.studentId);
                }}
              >
                <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                {restore.isPending
                  ? 'Restaurando…'
                  : 'Restaurar datos originales'}
              </button>
            </div>
          )}
        </BentoCard>
        {error ? (
          <p role="alert" className="field-error">
            {errorMessage(error)}
          </p>
        ) : null}
        {busy ? (
          <p role="status" className="text-sm">
            {prepare.isPending
              ? 'Preparando historial y calculando diagnóstico…'
              : 'Restaurando la rutina original…'}{' '}
            Esperá a que termine la operación.
          </p>
        ) : null}
        {restore.isSuccess && !busy ? (
          <p role="status" className="text-sm text-[#3f6b1f]">
            {restore.data.restored
              ? 'Rutina original restaurada. Podés repetir cualquier caso.'
              : 'El alumno ya tenía sus datos originales.'}
          </p>
        ) : null}
        {active ? (
          <BentoCard>
            <p className="eyebrow text-[#68675f]">
              Preparación activa · {selected?.displayName}
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              {
                scenarios.find((scenario) => scenario.id === active.scenario)
                  ?.title
              }
            </h2>
            <p className="mt-2 text-sm">
              Diagnóstico:{' '}
              <strong>{humanizeEnum(active.globalSituation)}</strong>.{' '}
              {active.proposalId
                ? `Propuesta ${humanizeEnum(active.proposalState ?? 'PENDIENTE').toLowerCase()}.`
                : active.proposalStatus === 'DATOS_INSUFICIENTES'
                  ? 'No se genera propuesta por falta de evidencia.'
                  : 'No se necesitan ajustes; no se genera propuesta.'}
            </p>
            {prepare.data?.reused ? (
              <p className="mt-2 text-sm text-[#68675f]">
                Se reutilizó el caso pendiente; no se duplicaron sus registros.
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {active.proposalId ? (
                <a
                  className="btn-primary btn-sm"
                  href={`/entrenador/rutinas/revisar/${active.proposalId}`}
                  target="vivaz-demo-app"
                  rel="noopener noreferrer"
                >
                  Ver propuesta{' '}
                  <ExternalLink className="ml-2 size-4" aria-hidden="true" />
                </a>
              ) : null}
              <a
                className="btn-secondary btn-sm"
                href={`/entrenador/alumnos/${selected!.studentId}`}
                target="vivaz-demo-app"
                rel="noopener noreferrer"
              >
                Ver diagnóstico del alumno
              </a>
            </div>
          </BentoCard>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario, index) => (
            <BentoCard key={scenario.id}>
              <p className="eyebrow text-[#68675f]">Caso {index + 1}</p>
              <h2 className="mt-2 text-lg font-semibold">{scenario.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#68675f]">
                {scenario.evidence}
              </p>
              <p className="mt-2 text-sm leading-relaxed">{scenario.outcome}</p>
              <button
                type="button"
                className="btn-primary mt-5 w-full"
                disabled={
                  busy || !selected?.hasCurrentRoutine || students.isError
                }
                onClick={() => {
                  restore.reset();
                  prepare.mutate({
                    id: selected!.studentId,
                    scenario: scenario.id,
                  });
                }}
              >
                Preparar {scenario.title.toLowerCase()}
              </button>
            </BentoCard>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-[#68675f]">
          Repetir un caso pendiente el mismo día conserva su propuesta. Para
          empezar de nuevo después de aprobar o rechazar, pulsá el caso otra
          vez. Cambiar de caso restaura la preparación anterior automáticamente.
          Al terminar la demo, restaurá cada alumno preparado.
        </p>
      </main>
    </div>
  );
}
