import type { WriteTemplate } from '../../api/prescriptions';

export interface RoutineDayForm {
  key: string;
  name: string;
  exercises: RoutineExerciseForm[];
}

export interface RoutineExerciseForm {
  key: string;
  exerciseId: string;
  exerciseName: string;
  note: string;
  sets: RoutineSetForm[];
}

export interface RoutineSetForm {
  key: string;
  minRepetitions: string;
  maxRepetitions: string;
  suggestedLoad: string;
  restSeconds: string;
  warmup: boolean;
}

let nextKey = 0;
export function formKey(): string {
  nextKey += 1;
  return `nuevo-${nextKey}`;
}

export function defaultSetForm(): RoutineSetForm {
  return {
    key: formKey(),
    minRepetitions: '8',
    maxRepetitions: '12',
    suggestedLoad: '',
    restSeconds: '60',
    warmup: false,
  };
}

export function blankDayForm(): RoutineDayForm {
  return { key: formKey(), name: '', exercises: [] };
}

export function detailToDayForms(input: {
  name: string;
  routineType: WriteTemplate['routineType'];
  days: WriteTemplate['days'];
}): RoutineDayForm[] {
  const { days } = input;
  return days.map((day) => ({
    key: formKey(),
    name: day.name,
    exercises: day.exercises.map((exercise) => ({
      key: formKey(),
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName ?? 'Ejercicio del catálogo',
      note: exercise.note ?? '',
      sets: exercise.sets.map((set) => ({
        key: formKey(),
        minRepetitions: String(set.minRepetitions),
        maxRepetitions: String(set.maxRepetitions),
        suggestedLoad:
          set.suggestedLoad === null || set.suggestedLoad === undefined
            ? ''
            : String(set.suggestedLoad),
        restSeconds: String(set.restSeconds),
        warmup: set.warmup,
      })),
    })),
  }));
}

function toNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Invariantes de días/ejercicios/series (RN-41, RN-43 como integridad). */
export function validateDayForms(days: RoutineDayForm[]): string[] {
  const problems: string[] = [];
  if (days.length < 1 || days.length > 7)
    problems.push('La rutina lleva entre 1 y 7 días.');
  days.forEach((day, index) => {
    const label = `Día ${index + 1}`;
    if (day.name.trim() === '') problems.push(`${label}: poné un nombre.`);
    if (day.exercises.length < 1)
      problems.push(`${label}: agregá al menos un ejercicio.`);
    day.exercises.forEach((exercise) => {
      if (exercise.sets.length < 1)
        problems.push(
          `${label}: «${exercise.exerciseName}» necesita al menos una serie.`,
        );
      exercise.sets.forEach((set) => {
        const min = toNumber(set.minRepetitions);
        const max = toNumber(set.maxRepetitions);
        const rest = toNumber(set.restSeconds);
        const load =
          set.suggestedLoad.trim() === '' ? 0 : toNumber(set.suggestedLoad);
        if (
          min === null ||
          max === null ||
          rest === null ||
          load === null ||
          !Number.isInteger(min) ||
          !Number.isInteger(max) ||
          !Number.isInteger(rest) ||
          min < 1 ||
          max < min ||
          rest < 0 ||
          load < 0
        )
          problems.push(
            `${label}: revisá repeticiones, carga y descanso de «${exercise.exerciseName}».`,
          );
      });
    });
  });
  return [...new Set(problems)];
}

export function dayFormsToPayload(
  days: RoutineDayForm[],
): WriteTemplate['days'] {
  return days.map((day) => ({
    name: day.name.trim(),
    exercises: day.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      note: exercise.note.trim() === '' ? null : exercise.note.trim(),
      sets: exercise.sets.map((set) => ({
        minRepetitions: Number(set.minRepetitions),
        maxRepetitions: Number(set.maxRepetitions),
        suggestedLoad:
          set.suggestedLoad.trim() === '' ? null : Number(set.suggestedLoad),
        restSeconds: Number(set.restSeconds),
        warmup: set.warmup,
      })),
    })),
  }));
}
