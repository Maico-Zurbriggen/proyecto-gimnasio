import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '../../../api/client';
import { getLocalProposalResolutions } from '../../../api/proposals';
import { Banner } from '../../../shared/components/Banner';
import { humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { StatCard } from '../../../shared/ui/StatCard';
import { useActiveRoutine } from '../hooks/useActiveRoutine';

interface Exercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  load: string;
  rest: string;
  notes?: string;
  adapted?: boolean;
}

interface RoutineDay {
  id: string;
  dayNumber: number;
  title: string;
  focus: string;
  estimatedMinutes: number;
  exercises: Exercise[];
}

export function StudentRoutinePage() {
  const {
    data: routine,
    error,
    isPending,
    refetch,
    isFetching,
  } = useActiveRoutine();
  const resolutions = getLocalProposalResolutions();
  const hasAccepted = Object.values(resolutions).find(
    (r) => r.decision !== 'RECHAZADA',
  );

  const isV2 =
    Boolean(hasAccepted) || (routine?.currentVersionNumber ?? 1) >= 2;
  const versionNum = routine?.currentVersionNumber ?? (isV2 ? 2 : 1);

  const [selectedDayId, setSelectedDayId] = useState<string>('day-1');

  const days: RoutineDay[] = [
    {
      id: 'day-1',
      dayNumber: 1,
      title: 'Día 1: Empuje',
      focus: 'Pecho, Hombro anterior y Tríceps',
      estimatedMinutes: 60,
      exercises: [
        {
          id: 'ex-1',
          name: 'Press de banca plano con barra',
          muscle: 'Pectoral mayor',
          sets: 4,
          reps: '8 reps',
          load: isV2 ? '72,5 kg' : '70 kg',
          rest: '90s',
          notes: isV2
            ? 'Adaptación de tu entrenador: +2,5 kg respecto al ciclo anterior'
            : 'Mantener retracción escapular y rango completo',
          adapted: isV2,
        },
        {
          id: 'ex-2',
          name: 'Press inclinado con mancuernas',
          muscle: 'Pectoral superior',
          sets: 3,
          reps: '10 reps',
          load: '22 kg c/u',
          rest: '75s',
          notes: 'Banco a 30 grados de inclinación',
        },
        {
          id: 'ex-3',
          name: 'Fondos en paralelas',
          muscle: 'Tríceps / Pecho inferior',
          sets: 3,
          reps: '10 reps',
          load: 'Peso corporal',
          rest: '60s',
          notes: 'Controlar la fase excéntrica en 2 segundos',
        },
        {
          id: 'ex-4',
          name: 'Extensiones de tríceps en polea alta',
          muscle: 'Tríceps (cabeza lateral)',
          sets: 3,
          reps: '12 reps',
          load: '25 kg',
          rest: '60s',
        },
      ],
    },
    {
      id: 'day-2',
      dayNumber: 2,
      title: 'Día 2: Tracción',
      focus: 'Espalda, Hombro posterior y Bíceps',
      estimatedMinutes: 60,
      exercises: [
        {
          id: 'ex-5',
          name: 'Remo con barra',
          muscle: 'Dorsal ancho y Trapecio',
          sets: 4,
          reps: '8 reps',
          load: isV2 ? '62,5 kg' : '60 kg',
          rest: '90s',
          notes: isV2
            ? 'Ajuste aprobado: carga incrementada a 62,5 kg'
            : 'Torso a 45 grados, codos pegados al cuerpo',
          adapted: isV2,
        },
        {
          id: 'ex-6',
          name: 'Jalón al pecho con agarre neutro',
          muscle: 'Dorsal ancho',
          sets: 3,
          reps: '10 reps',
          load: '52,5 kg',
          rest: '75s',
        },
        {
          id: 'ex-7',
          name: 'Remo unilateral en polea baja',
          muscle: 'Espalda media',
          sets: 3,
          reps: '12 reps',
          load: '45 kg',
          rest: '60s',
        },
        {
          id: 'ex-8',
          name: 'Curl inclinado con mancuernas',
          muscle: 'Bíceps (cabeza larga)',
          sets: 3,
          reps: '12 reps',
          load: '12 kg c/u',
          rest: '60s',
        },
      ],
    },
    {
      id: 'day-3',
      dayNumber: 3,
      title: 'Día 3: Piernas & Core',
      focus: 'Cuádriceps, Isquiotibiales y Abdomen',
      estimatedMinutes: 65,
      exercises: [
        {
          id: 'ex-9',
          name: 'Sentadilla trasera profunda',
          muscle: 'Cuádriceps y Glúteos',
          sets: 4,
          reps: '8 reps',
          load: isV2 ? '82,5 kg' : '80 kg',
          rest: '120s',
          notes: isV2
            ? 'Sobrecarga progresiva de ciclo v2'
            : 'Respiración diafragmática y braceo abdominal',
          adapted: isV2,
        },
        {
          id: 'ex-10',
          name: 'Prensa 45°',
          muscle: 'Cuádriceps',
          sets: 3,
          reps: '10 reps',
          load: '140 kg',
          rest: '90s',
        },
        {
          id: 'ex-11',
          name: 'Peso muerto rumano con mancuernas',
          muscle: 'Cadena posterior e Isquiotibiales',
          sets: 3,
          reps: '10 reps',
          load: '70 kg',
          rest: '90s',
        },
        {
          id: 'ex-12',
          name: 'Elevación de talones de pie',
          muscle: 'Gemelos',
          sets: 4,
          reps: '15 reps',
          load: '50 kg',
          rest: '45s',
        },
      ],
    },
    {
      id: 'day-4',
      dayNumber: 4,
      title: 'Día 4: Hombros & Brazos',
      focus: 'Deltoides, Bíceps y Tríceps',
      estimatedMinutes: 55,
      exercises: [
        {
          id: 'ex-13',
          name: 'Press militar con barra de pie',
          muscle: 'Deltoides anterior y Core',
          sets: 4,
          reps: '8 reps',
          load: '40 kg',
          rest: '90s',
        },
        {
          id: 'ex-14',
          name: 'Elevaciones laterales con mancuernas',
          muscle: 'Deltoides lateral',
          sets: 4,
          reps: '12 reps',
          load: '10 kg c/u',
          rest: '60s',
        },
        {
          id: 'ex-15',
          name: 'Face pulls en polea alta con cuerda',
          muscle: 'Deltoides posterior y Manguito rotador',
          sets: 3,
          reps: '15 reps',
          load: '20 kg',
          rest: '45s',
        },
        {
          id: 'ex-16',
          name: 'Curl martillo en banco',
          muscle: 'Braquial y Antebrazos',
          sets: 3,
          reps: '12 reps',
          load: '14 kg c/u',
          rest: '60s',
        },
      ],
    },
  ];

  const defaultDay = days[0] as RoutineDay;
  const activeDay = days.find((d) => d.id === selectedDayId) ?? defaultDay;

  const headerActions = (
    <div className="flex items-center gap-2">
      <Link
        to="/alumno/sesion"
        className="flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-xs font-bold text-graphite transition hover:brightness-105"
      >
        <Play className="size-3.5 fill-current" /> Iniciar sesión
      </Link>
    </div>
  );

  if (isPending) {
    return (
      <div>
        <PageHeader kicker="Mi rutina" title="Cargando tu rutina…" />
      </div>
    );
  }

  const sinRutina =
    Boolean(error) &&
    error instanceof ApiError &&
    (error.status === 404 || error.status === 409) &&
    !hasAccepted;

  if (sinRutina) {
    return (
      <div>
        <PageHeader
          kicker="Mi rutina"
          title="Sin rutina asignada"
          description="Tu entrenador todavía no ha prescripto una rutina activa para tu usuario."
        />
        <main className="px-4 pb-10 sm:px-7 lg:px-9">
          <Banner variant="info" title="Tu rutina está en preparación">
            <p>
              Cuando tu entrenador Diego Romero apruebe tu plan vas a ver acá
              los días de entrenamiento, ejercicios, series y cargas de tu
              ciclo.
            </p>
          </Banner>
        </main>
      </div>
    );
  }

  if (error && !hasAccepted) {
    return (
      <div>
        <PageHeader kicker="Mi rutina" title="No pudimos consultar tu rutina" />
        <main className="px-4 pb-10 sm:px-7 lg:px-9">
          <Banner
            variant="danger"
            title="Error al cargar la rutina"
            actions={
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                Reintentar
              </button>
            }
          >
            <p>Por favor revisá tu conexión o intentá nuevamente.</p>
          </Banner>
        </main>
      </div>
    );
  }

  const routineType = routine?.routineType
    ? humanizeEnum(routine.routineType)
    : 'Fuerza base';
  const cycleDays = routine?.duracionCicloDias ?? 60;
  const daysLeft = routine?.diasRestantesRenovacion ?? 60;

  return (
    <div>
      <PageHeader
        kicker="Mi rutina de entrenamiento"
        title={`${routineType} · 4 días`}
        description={`Plan personalizado diseñado por tu entrenador Diego Romero · Ciclo de ${cycleDays} días.`}
        actions={headerActions}
      />
      <main className="flex flex-col gap-5 px-4 pb-10 sm:px-7 lg:px-9">
        {/* Cycle & version summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Tipo de plan"
            value={routineType}
            detail="Frecuencia semanal: 4 días"
            icon={Dumbbell}
            tone="lime"
          />
          <StatCard
            label="Versión activa"
            value={`v${versionNum}`}
            detail={
              isV2 ? 'Adaptaciones aplicadas por tu coach' : 'Plan base vigente'
            }
            icon={Sparkles}
          />
          <StatCard
            label="Días para renovación"
            value={String(daysLeft)}
            detail={`Ciclo total de ${cycleDays} días`}
            icon={RotateCcw}
          />
          <StatCard
            label="Adherencia objetivo"
            value="88%"
            detail="7 de 8 sesiones completadas"
            icon={Flame}
          />
        </div>

        {isV2 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-lime/30 bg-lime-soft p-4 text-xs font-medium text-[#465625]">
            <CheckCircle2 className="size-5 shrink-0" />
            <div>
              <p className="font-bold text-ink">
                ¡Tu rutina tiene adaptaciones aplicadas de la Versión{' '}
                {versionNum}!
              </p>
              <p className="mt-0.5 text-[#586d26]">
                Tu entrenador revisó tu progreso y ajustó las cargas sugeridas
                en los ejercicios clave para continuar con la sobrecarga
                progresiva.
              </p>
            </div>
          </div>
        ) : null}

        {/* Days selector navigation */}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-[#292823]/10 bg-white/70 p-1.5 backdrop-blur-sm">
          {days.map((day) => {
            const isSelected = day.id === activeDay.id;
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDayId(day.id)}
                className={`flex-1 min-w-[120px] rounded-xl px-4 py-2.5 text-xs font-bold transition text-center ${
                  isSelected
                    ? 'bg-graphite text-white shadow-sm'
                    : 'text-[#6c6a62] hover:bg-black/5'
                }`}
              >
                <div>{day.title}</div>
                <div
                  className={`mt-0.5 text-[10px] font-medium ${isSelected ? 'text-white/70' : 'text-[#8c897f]'}`}
                >
                  {day.focus.split(',')[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Day View */}
        <BentoCard>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#292823]/8 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="eyebrow text-[#77756d]">Detalle del día</span>
                <span className="flex items-center gap-1 text-[11px] text-[#77756d]">
                  <Clock className="size-3" /> ~{activeDay.estimatedMinutes} min
                </span>
              </div>
              <h2 className="font-display mt-1 text-2xl font-semibold tracking-[-0.04em] text-ink">
                {activeDay.title}
              </h2>
              <p className="mt-0.5 text-xs text-[#77756d]">
                Grupos musculares principales: {activeDay.focus}.
              </p>
            </div>

            <Link
              to="/alumno/sesion"
              className="flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-xs font-bold text-graphite transition hover:brightness-105"
            >
              Iniciar {activeDay.title.split(':')[0]}{' '}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {/* Exercises list */}
          <div className="mt-4 divide-y divide-[#292823]/8">
            {activeDay.exercises.map((ex, index) => (
              <div
                key={ex.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3.5 sm:flex-nowrap"
              >
                <div className="flex items-start gap-3">
                  <span className="font-display text-sm font-black text-[#b4b2a9]">
                    0{index + 1}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-ink">{ex.name}</p>
                      <span className="rounded-full bg-[#f4f3ee] px-2 py-0.5 text-[10px] font-semibold text-[#77756d]">
                        {ex.muscle}
                      </span>
                      {ex.adapted ? (
                        <span className="rounded-full bg-lime-soft px-2 py-0.5 text-[9px] font-bold text-[#526026]">
                          Adaptado
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-xs text-[#68665e]">
                      {ex.sets} series × {ex.reps} · descanso de {ex.rest} entre
                      series
                    </p>

                    {ex.notes ? (
                      <p className="mt-1 text-[11px] font-medium text-[#526026]">
                        💡 {ex.notes}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-center sm:self-start">
                  <div className="text-right">
                    <span className="rounded-xl bg-[#f0efe8] px-3 py-1.5 font-display text-xs font-bold text-graphite">
                      {ex.load}
                    </span>
                    <p className="mt-1 text-[9px] text-[#8c897f]">
                      Carga prescrita
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Coach tips & instructions */}
        <BentoCard tone="lime">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/40">
              <Sparkles className="size-5 text-graphite" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold tracking-[-0.03em] text-ink">
                Pautas de tu entrenador Diego Romero
              </h3>
              <p className="mt-1 text-xs leading-5 text-ink/80">
                Respetá siempre los tiempos de pausa indicados entre series para
                permitir la recuperación fosfágena. Registrá cualquier molestia
                articular o falta de recuperación al terminar la sesión.
              </p>
            </div>
          </div>
        </BentoCard>
      </main>
    </div>
  );
}
