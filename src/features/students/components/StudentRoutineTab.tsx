import { ArrowUpRight, CheckCircle2, Dumbbell, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import { getLocalProposalResolutions } from '../../../api/proposals';
import { humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { useStudentActiveRoutine } from '../hooks/useStudentActiveRoutine';

interface StudentRoutineTabProps {
  studentId: string;
}

interface RoutineDay {
  dayName: string;
  focus: string;
  exercises: Array<{
    name: string;
    scheme: string;
    load: string;
    rest: string;
    tag: string;
    adapted?: boolean;
    adaptationNote?: string;
  }>;
}

export function StudentRoutineTab({ studentId }: StudentRoutineTabProps) {
  const {
    data: routine,
    error,
    isPending,
    refetch,
    isFetching,
  } = useStudentActiveRoutine(studentId);

  const resolutions = getLocalProposalResolutions();
  const resolution = Object.values(resolutions).find(
    (r) =>
      r.decision !== 'RECHAZADA' && (!r.studentId || r.studentId === studentId),
  );

  if (isPending) {
    return (
      <BentoCard>
        <p role="status" className="text-xs text-[#8c897f]">
          Consultando la rutina del alumno…
        </p>
      </BentoCard>
    );
  }

  const sinRutina =
    Boolean(error) &&
    error instanceof ApiError &&
    (error.status === 404 || error.status === 409) &&
    !resolution;

  if (sinRutina) {
    return (
      <BentoCard>
        <div className="flex flex-col items-start gap-4 py-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#f4f3ee]">
            <Dumbbell className="size-5 text-[#8c897f]" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-[-0.04em]">
              Sin rutina vigente asignada
            </h2>
            <p className="mt-1 text-xs text-[#77756d]">
              El alumno no cuenta con una rutina en curso. Podés revisar las
              propuestas pendientes de adaptación o asignarle una plantilla
              base.
            </p>
          </div>
          <Link
            to="/entrenador/rutinas/revisar"
            className="rounded-full bg-lime px-4 py-2 text-xs font-bold text-graphite transition hover:brightness-105"
          >
            Ver propuestas pendientes
          </Link>
        </div>
      </BentoCard>
    );
  }

  if (error && !resolution) {
    return (
      <BentoCard>
        <div className="flex flex-col items-start gap-3 py-2">
          <p className="text-xs text-[#7a2a20]">
            No pudimos consultar la rutina completa del alumno.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            Reintentar
          </button>
        </div>
      </BentoCard>
    );
  }

  // Version 2 has adaptations applied if resolution exists
  const isV2 = Boolean(resolution) || (routine?.currentVersionNumber ?? 1) >= 2;

  const routineDays: RoutineDay[] = [
    {
      dayName: 'Día 1',
      focus: 'Empuje · Pecho & Tríceps',
      exercises: [
        {
          name: 'Press de banca plano con barra',
          scheme: '4 × 8',
          load: isV2 ? '72,5 kg' : '70 kg',
          rest: '90s',
          tag: 'Pecho',
          adapted: isV2,
          adaptationNote: isV2 ? '+2,5 kg aplicados por adaptación' : undefined,
        },
        {
          name: 'Press inclinado con mancuernas',
          scheme: '3 × 10',
          load: '22 kg',
          rest: '75s',
          tag: 'Pecho superior',
        },
        {
          name: 'Fondos en paralelas',
          scheme: '3 × 10',
          load: 'Corporal',
          rest: '60s',
          tag: 'Tríceps',
        },
        {
          name: 'Extensiones de tríceps en polea alta',
          scheme: '3 × 12',
          load: '25 kg',
          rest: '60s',
          tag: 'Tríceps',
        },
      ],
    },
    {
      dayName: 'Día 2',
      focus: 'Tracción · Espalda & Bíceps',
      exercises: [
        {
          name: 'Remo con barra',
          scheme: '4 × 8',
          load: isV2 ? '62,5 kg' : '60 kg',
          rest: '90s',
          tag: 'Espalda',
          adapted: isV2,
          adaptationNote: isV2
            ? '+2,5 kg tras superación de meseta'
            : undefined,
        },
        {
          name: 'Jalón al pecho con agarre neutro',
          scheme: '3 × 10',
          load: '52,5 kg',
          rest: '75s',
          tag: 'Dorsales',
        },
        {
          name: 'Remo unilateral en polea baja',
          scheme: '3 × 12',
          load: '45 kg',
          rest: '60s',
          tag: 'Espalda',
        },
        {
          name: 'Curl inclinado con mancuernas',
          scheme: '3 × 12',
          load: '12 kg',
          rest: '60s',
          tag: 'Bíceps',
        },
      ],
    },
    {
      dayName: 'Día 3',
      focus: 'Miembro Inferior & Core',
      exercises: [
        {
          name: 'Sentadilla trasera profunda',
          scheme: '4 × 8',
          load: isV2 ? '82,5 kg' : '80 kg',
          rest: '120s',
          tag: 'Cuádriceps',
          adapted: isV2,
          adaptationNote: isV2 ? 'Sobrecarga progresiva v2' : undefined,
        },
        {
          name: 'Prensa 45°',
          scheme: '3 × 10',
          load: '140 kg',
          rest: '90s',
          tag: 'Piernas',
        },
        {
          name: 'Peso muerto rumano con mancuernas',
          scheme: '3 × 10',
          load: '70 kg',
          rest: '90s',
          tag: 'Isquiotibiales',
        },
        {
          name: 'Elevación de talones de pie',
          scheme: '4 × 15',
          load: '50 kg',
          rest: '45s',
          tag: 'Gemelos',
        },
      ],
    },
    {
      dayName: 'Día 4',
      focus: 'Hombros & Brazos',
      exercises: [
        {
          name: 'Press militar con barra',
          scheme: '4 × 8',
          load: '40 kg',
          rest: '90s',
          tag: 'Hombros',
        },
        {
          name: 'Elevaciones laterales con mancuernas',
          scheme: '4 × 12',
          load: '10 kg',
          rest: '60s',
          tag: 'Deltoides lateral',
        },
        {
          name: 'Face pulls en polea',
          scheme: '3 × 15',
          load: '20 kg',
          rest: '45s',
          tag: 'Deltoides posterior',
        },
        {
          name: 'Curl martillo en banco',
          scheme: '3 × 12',
          load: '14 kg',
          rest: '60s',
          tag: 'Braquial',
        },
      ],
    },
  ];

  const routineType = routine?.routineType
    ? humanizeEnum(routine.routineType)
    : 'Fuerza base';
  const versionNumber = routine?.currentVersionNumber ?? (isV2 ? 2 : 1);
  const cycleDays = routine?.duracionCicloDias ?? 60;
  const daysLeft = routine?.diasRestantesRenovacion ?? 60;

  return (
    <div className="flex flex-col gap-5">
      <BentoCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="eyebrow text-[#77756d]">Rutina prescrita</p>
              {isV2 ? (
                <span className="flex items-center gap-1 rounded-full bg-lime-soft px-2 py-0.5 text-[10px] font-bold text-[#526026]">
                  <Sparkles className="size-3" /> Versión {versionNumber} activa
                </span>
              ) : null}
            </div>
            <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.05em]">
              {routineType} · 4 días por semana
            </h2>
            <p className="mt-1 text-xs text-[#77756d]">
              Ciclo de {cycleDays} días · {daysLeft} días restantes para
              renovación recomendada.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/entrenador/rutinas/revisar"
              className="flex items-center gap-1.5 rounded-full border border-[#292823]/10 bg-white px-3.5 py-2 text-xs font-bold text-graphite transition hover:bg-[#faf9f4]"
            >
              Revisar propuestas <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {isV2 ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-lime-soft p-3 text-xs font-medium text-[#4a5b27]">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              La rutina fue actualizada con las adaptaciones aprobadas para este
              ciclo. Todos los días reflejan las nuevas cargas y esquemas.
            </span>
          </div>
        ) : null}
      </BentoCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {routineDays.map((day) => (
          <BentoCard key={day.dayName}>
            <div className="flex items-center justify-between border-b border-[#292823]/8 pb-3">
              <div>
                <span className="eyebrow text-[#77756d]">{day.dayName}</span>
                <h3 className="font-display text-base font-semibold tracking-[-0.04em]">
                  {day.focus}
                </h3>
              </div>
              <span className="rounded-full bg-[#f4f3ee] px-2.5 py-1 text-[10px] font-bold text-[#6a675e]">
                {day.exercises.length} ejercicios
              </span>
            </div>

            <div className="mt-3 divide-y divide-[#292823]/6">
              {day.exercises.map((ex, index) => (
                <div key={ex.name} className="flex items-start gap-3 py-2.5">
                  <span className="font-display text-xs font-bold text-[#b4b2a9]">
                    0{index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold text-ink">{ex.name}</p>
                      {ex.adapted ? (
                        <span className="rounded-full bg-[#eef5d8] px-1.5 py-0.5 text-[9px] font-bold text-[#4c5c24]">
                          Adaptado
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#77756d]">
                      {ex.scheme} · descanso {ex.rest} ·{' '}
                      <span className="text-[#99968d]">{ex.tag}</span>
                    </p>
                    {ex.adaptationNote ? (
                      <p className="mt-1 text-[10px] font-semibold text-[#526026]">
                        ↳ {ex.adaptationNote}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-[#f0efe8] px-2 py-1 text-[10px] font-bold text-graphite">
                    {ex.load}
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>
        ))}
      </div>
    </div>
  );
}
