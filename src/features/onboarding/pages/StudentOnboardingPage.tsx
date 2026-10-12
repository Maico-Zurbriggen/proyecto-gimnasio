import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { fieldErrors } from '../../../api/client';
import {
  EXPERIENCE_LEVELS,
  GOAL_TYPES,
  SEXES,
  declareGoal,
  fetchOwnContext,
  saveOwnContext,
  studentContextQueryKey,
  type StudentContextInput,
} from '../../../api/studentContext';
import { humanizeEnum } from '../../../shared/lib/format';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';

type Campo = keyof StudentContextInput | 'goal';

const INPUT_CLASS =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-graphite';

function Errores({ id, mensajes }: { id: string; mensajes?: string[] }) {
  if (!mensajes?.length) return null;
  return (
    <p id={id} className="text-coral-text text-xs font-semibold">
      <span aria-hidden="true">✕ </span>
      {mensajes.join(' ')}
    </p>
  );
}

/**
 * Puesta en contexto del alumno (FL-01, pasos 1 y 3).
 *
 * Es a donde llega un alumno recién dado de alta por invitación (HU06): su
 * perfil nace vacío y sin este contexto no se le puede generar rutina (RN-97b).
 * Las condiciones físicas se declaran desde su perfil (HU11).
 */
export function StudentOnboardingPage({ studentId }: { studentId: string }) {
  const ids = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const context = useQuery({
    queryKey: studentContextQueryKey,
    queryFn: ({ signal }) => fetchOwnContext(signal),
  });

  const [form, setForm] = useState({
    experienceLevel: '',
    availableDaysPerWeek: '',
    birthDate: '',
    sex: '',
    heightCm: '',
    weightKg: '',
    goal: '',
  });
  const [errores, setErrores] = useState<Partial<Record<Campo, string[]>>>({});

  useEffect(() => {
    const data = context.data;
    if (!data) return;
    setForm((actual) => ({
      ...actual,
      experienceLevel: data.experienceLevel ?? actual.experienceLevel,
      availableDaysPerWeek:
        data.availableDaysPerWeek?.toString() ?? actual.availableDaysPerWeek,
      birthDate: data.birthDate ?? actual.birthDate,
      sex: data.sex ?? actual.sex,
      heightCm: data.heightCm?.toString() ?? actual.heightCm,
      weightKg: data.weightKg?.toString() ?? actual.weightKg,
    }));
  }, [context.data]);

  const guardar = useMutation({
    mutationFn: async (input: {
      context: StudentContextInput;
      goal: (typeof GOAL_TYPES)[number];
    }) => {
      await saveOwnContext(input.context);
      await declareGoal(studentId, input.goal);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['students'] });
      navigate('/alumno', { replace: true });
    },
    onError: (error) => {
      setErrores(fieldErrors(error));
    },
  });

  const cambiar = (campo: Campo, valor: string) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const faltantes: Partial<Record<Campo, string[]>> = {};
    const obligatorio = 'Este dato es obligatorio.';
    if (!form.goal) faltantes.goal = [obligatorio];
    if (!form.experienceLevel) faltantes.experienceLevel = [obligatorio];
    if (!form.availableDaysPerWeek)
      faltantes.availableDaysPerWeek = [obligatorio];
    if (!form.birthDate) faltantes.birthDate = [obligatorio];
    if (!form.sex) faltantes.sex = [obligatorio];
    if (!form.heightCm) faltantes.heightCm = [obligatorio];
    if (!form.weightKg) faltantes.weightKg = [obligatorio];
    setErrores(faltantes);
    if (Object.keys(faltantes).length > 0) return;

    guardar.mutate({
      goal: form.goal as (typeof GOAL_TYPES)[number],
      context: {
        experienceLevel:
          form.experienceLevel as StudentContextInput['experienceLevel'],
        availableDaysPerWeek: Number(form.availableDaysPerWeek),
        birthDate: form.birthDate,
        sex: form.sex as StudentContextInput['sex'],
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
      },
    });
  };

  const campo = (
    nombre: Campo,
    etiqueta: string,
    control: (props: {
      id: string;
      'aria-invalid'?: boolean;
      'aria-describedby'?: string;
      className: string;
    }) => ReactNode,
  ) => {
    const id = `${ids}-${nombre}`;
    const conError = Boolean(errores[nombre]?.length);
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="eyebrow text-[#5f5d55]">
          {etiqueta} <span aria-hidden="true">*</span>
        </label>
        {control({
          id,
          'aria-invalid': conError || undefined,
          'aria-describedby': conError ? `${id}-error` : undefined,
          className: `${INPUT_CLASS} ${conError ? 'border-coral-strong' : 'border-[#292823]/15'}`,
        })}
        <Errores id={`${id}-error`} mensajes={errores[nombre]} />
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        kicker="Bienvenida"
        title="Contanos cómo entrenás."
        description="Con estos datos tu entrenador y el sistema arman una rutina a tu medida."
      />
      <main className="px-4 pb-10 sm:px-7 lg:px-9">
        <BentoCard className="max-w-xl">
          {context.isPending ? (
            <p role="status" className="text-sm text-[#5f5d55]">
              Cargando tu perfil…
            </p>
          ) : context.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-sm">No pudimos cargar tu perfil.</p>
              <button
                type="button"
                onClick={() => void context.refetch()}
                className="bg-graphite rounded-full px-4 py-2 text-sm font-bold text-white"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <>
              <div
                className={`mb-5 rounded-2xl px-4 py-3 text-sm ${context.data.trainer ? 'bg-lime-soft text-[#3b4d14]' : 'bg-[#fdf3e0] text-[#5a3d0c]'}`}
              >
                <p className="eyebrow">Tu profesor</p>
                <p className="mt-1 font-semibold">
                  {context.data.trainer
                    ? context.data.trainer.displayName
                    : 'Todavía no tenés profesor asignado. El gimnasio te va a asignar uno.'}
                </p>
              </div>
              <form
                noValidate
                aria-label="Puesta en contexto"
                onSubmit={handleSubmit}
                className="grid gap-4 sm:grid-cols-2"
              >
                {campo('goal', 'Objetivo', (props) => (
                  <select
                    {...props}
                    required
                    value={form.goal}
                    onChange={(event) => cambiar('goal', event.target.value)}
                  >
                    <option value="">Elegí tu objetivo</option>
                    {GOAL_TYPES.map((goal) => (
                      <option key={goal} value={goal}>
                        {humanizeEnum(goal)}
                      </option>
                    ))}
                  </select>
                ))}
                {campo('experienceLevel', 'Nivel de experiencia', (props) => (
                  <select
                    {...props}
                    required
                    value={form.experienceLevel}
                    onChange={(event) =>
                      cambiar('experienceLevel', event.target.value)
                    }
                  >
                    <option value="">Elegí tu nivel</option>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {humanizeEnum(level)}
                      </option>
                    ))}
                  </select>
                ))}
                {campo('availableDaysPerWeek', 'Días por semana', (props) => (
                  <select
                    {...props}
                    required
                    value={form.availableDaysPerWeek}
                    onChange={(event) =>
                      cambiar('availableDaysPerWeek', event.target.value)
                    }
                  >
                    <option value="">Elegí cuántos días</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                      <option key={days} value={days}>
                        {days} {days === 1 ? 'día' : 'días'}
                      </option>
                    ))}
                  </select>
                ))}
                {campo('birthDate', 'Fecha de nacimiento', (props) => (
                  <input
                    {...props}
                    type="date"
                    required
                    value={form.birthDate}
                    onChange={(event) =>
                      cambiar('birthDate', event.target.value)
                    }
                  />
                ))}
                {campo('sex', 'Sexo', (props) => (
                  <select
                    {...props}
                    required
                    value={form.sex}
                    onChange={(event) => cambiar('sex', event.target.value)}
                  >
                    <option value="">Elegí una opción</option>
                    {SEXES.map((sex) => (
                      <option key={sex} value={sex}>
                        {humanizeEnum(sex)}
                      </option>
                    ))}
                  </select>
                ))}
                {campo('heightCm', 'Altura (cm)', (props) => (
                  <input
                    {...props}
                    type="number"
                    inputMode="decimal"
                    min={100}
                    max={250}
                    required
                    value={form.heightCm}
                    onChange={(event) =>
                      cambiar('heightCm', event.target.value)
                    }
                  />
                ))}
                {campo('weightKg', 'Peso (kg)', (props) => (
                  <input
                    {...props}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={20}
                    max={250}
                    required
                    value={form.weightKg}
                    onChange={(event) =>
                      cambiar('weightKg', event.target.value)
                    }
                  />
                ))}

                {guardar.isError && Object.keys(errores).length === 0 ? (
                  <p
                    role="alert"
                    className="text-coral-text text-xs font-semibold sm:col-span-2"
                  >
                    No pudimos guardar tus datos. Intentá de nuevo.
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={guardar.isPending}
                    className="bg-graphite rounded-full px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                  >
                    {guardar.isPending ? 'Guardando…' : 'Guardar y continuar'}
                  </button>
                  <Link
                    to="/alumno"
                    className="text-sm font-bold text-[#3d3c36] underline underline-offset-2"
                  >
                    Completar más tarde
                  </Link>
                </div>
              </form>
            </>
          )}
        </BentoCard>
      </main>
    </div>
  );
}
