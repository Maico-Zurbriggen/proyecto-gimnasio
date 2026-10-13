import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RoutineContentView } from './RoutineContentView';

const SERIE = {
  position: 1,
  minRepetitions: 8,
  maxRepetitions: 12,
  suggestedLoad: 20,
  restSeconds: 90,
  warmup: false,
};

function ejercicio(
  position: number,
  exerciseName: string,
  compatibility: {
    compatibilityState?: 'COMPATIBLE' | 'ADVERTIDO' | 'INCOMPATIBLE';
    compatibilityReason?: string | null;
  },
) {
  return {
    position,
    exerciseId: `ex-${String(position)}`,
    exerciseName,
    movementPattern: 'DOMINANTE_RODILLA',
    note: null,
    available: true,
    sets: [SERIE],
    ...compatibility,
  };
}

describe('RoutineContentView (HU11 - criterio front 13)', () => {
  it('marca los ejercicios advertidos e incompatibles con su motivo', () => {
    render(
      <RoutineContentView
        routine={{
          generationExplanation: null,
          generationWarnings: [],
          days: [
            {
              position: 1,
              name: 'Piernas',
              dominantPattern: 'DOMINANTE_RODILLA',
              exercises: [
                ejercicio(1, 'Sentadilla', {
                  compatibilityState: 'INCOMPATIBLE',
                  compatibilityReason:
                    'Compromete Rodilla (severidad moderada)',
                }),
                ejercicio(2, 'Puente de glúteo', {
                  compatibilityState: 'ADVERTIDO',
                  compatibilityReason: null,
                }),
                ejercicio(3, 'Gemelos de pie', {
                  compatibilityState: 'COMPATIBLE',
                }),
              ],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Incompatible')).toBeVisible();
    expect(
      screen.getByText('Compromete Rodilla (severidad moderada)'),
    ).toBeVisible();
    expect(screen.getByText('Advertencia')).toBeVisible();
    expect(
      screen.getByText('Involucra una zona con una condición leve.'),
    ).toBeVisible();
    expect(screen.getAllByText(/Incompatible|Advertencia/)).toHaveLength(2);
  });
});
