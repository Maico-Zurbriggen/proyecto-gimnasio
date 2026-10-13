import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CatalogExercise } from '../../api/catalog';
import { ExerciseForm } from './ExerciseForm';

describe('Own exercise media editing', () => {
  it('keeps a private illustration without making the browser require an HTTPS replacement', () => {
    const media = [
      {
        pose: 'PRINCIPAL' as const,
        url: `/catalog/media/${'a'.repeat(64)}/image.webp`,
      },
    ];
    const item: CatalogExercise = {
      id: 'fixture',
      name: 'Ejercicio de prueba',
      description: null,
      instructions: 'Instrucciones originales de prueba.',
      tips: [],
      movementPattern: 'CORE',
      difficultyLevel: 'PRINCIPIANTE',
      unilateral: false,
      equipment: ['PESO_CORPORAL'],
      primaryMuscles: ['GLUTEO'],
      secondaryMuscles: [],
      joints: ['CADERA'],
      media,
      origin: 'GIMNASIO',
      state: 'DESACTIVADO',
      source: null,
      authorUserId: 'trainer',
      revision: 2,
      enabled: false,
      availabilityRevision: null,
      availabilityUpdatedAt: null,
      updatedAt: '2026-10-07T00:00:00Z',
      reviewObservation: null,
    };
    const save = vi.fn();
    render(
      <ExerciseForm
        item={item}
        taxonomies={{
          muscles: [{ code: 'GLUTEO', name: 'Glúteo' }],
          equipment: [{ code: 'PESO_CORPORAL', name: 'Peso corporal' }],
          joints: [{ code: 'CADERA', name: 'Cadera' }],
        }}
        pending={false}
        onSave={save}
        onCancel={() => {}}
      />,
    );
    const form = screen.getByRole('form') as HTMLFormElement;
    expect(
      screen.getByText('Ilustración del catálogo conservada'),
    ).toBeVisible();
    expect(form.checkValidity()).toBe(true);
    fireEvent.submit(form);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ media }));
  });
});
