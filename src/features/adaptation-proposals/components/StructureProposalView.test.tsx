import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { StructureProposalView } from './StructureProposalView';

it('shows removed source exercises and the parameters captured with the proposed plan', () => {
  render(
    <StructureProposalView
      value={{
        routineType: 'HIPERTROFIA',
        targetWeeklyFrequency: 1,
        sourceExerciseNames: { old: 'Ejercicio anterior' },
        generationSettings: {
          revision: 2,
          settings: {
            minExercisesPerDay: 1,
            maxExercisesPerDay: 1,
            minWorkSetsPerExercise: 1,
            maxWorkSetsPerExercise: 1,
            minRepetitions: 8,
            maxRepetitions: 12,
            minRestSeconds: 60,
            maxRestSeconds: 90,
            warmupSetsPerExercise: 0,
          },
        },
        days: [
          {
            position: 1,
            name: 'Nuevo día',
            dominantPattern: 'CORE',
            exercises: [
              {
                exerciseId: 'new',
                exerciseName: 'Ejercicio nuevo',
                movementPattern: 'CORE',
                position: 1,
                note: null,
                compatibilityState: 'ADVERTIDO',
                compatibilityReason: null,
                sets: [
                  {
                    position: 1,
                    minRepetitions: 8,
                    maxRepetitions: 12,
                    suggestedLoad: null,
                    restSeconds: 60,
                    warmup: false,
                  },
                ],
              },
            ],
          },
        ],
      }}
      evidence={{
        estructuraVigente: {
          days: [
            { position: 1, name: 'Origen', exercises: [{ exerciseId: 'old' }] },
          ],
        },
      }}
    />,
  );
  const old = screen.getByRole('row', {
    name: 'Ejercicio anterior Origen Quitado de la propuesta',
  });
  expect(within(old).getByText('Quitado de la propuesta')).toBeVisible();
  expect(screen.getByText(/Parámetros del gimnasio usados/)).toHaveTextContent(
    '8–12 repeticiones',
  );
  expect(
    screen.getByRole('row', {
      name: 'Ejercicio nuevo Sin aparición en la versión de origen Nuevo día',
    }),
  ).toBeVisible();
});
