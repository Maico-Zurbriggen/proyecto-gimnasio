import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { RoutineReviewPage } from './RoutineReviewPage';

const STUDENT = '11111111-1111-4111-a111-111111111111';
const ROUTINE = '22222222-2222-4222-a222-222222222222';
const VERSION = '33333333-3333-4333-a333-333333333333';
const PATH = '/entrenador/rutinas/propuestas/:studentId/:routineId';
const URL = `/entrenador/rutinas/propuestas/${STUDENT}/${ROUTINE}`;

const CONTENIDO = {
  id: ROUTINE,
  studentId: STUDENT,
  routineType: 'FUERZA',
  state: 'PROPUESTA',
  origin: 'GENERADA',
  targetWeeklyFrequency: 3,
  requestedAt: '2026-10-01T10:00:00.000Z',
  versionId: VERSION,
  versionNumber: 1,
  generationPrompt: 'Tres días, foco en piernas',
  days: [
    {
      position: 1,
      name: 'Inferior',
      dominantPattern: 'DOMINANTE_RODILLA',
      exercises: [
        {
          position: 1,
          exerciseId: '44444444-4444-4444-a444-444444444444',
          exerciseName: 'Sentadilla',
          movementPattern: 'DOMINANTE_RODILLA',
          note: null,
          sets: [
            {
              position: 1,
              minRepetitions: 5,
              maxRepetitions: 5,
              suggestedLoad: 60,
              restSeconds: 120,
              warmup: false,
            },
          ],
        },
      ],
    },
  ],
};

const PENDIENTE = {
  routineId: ROUTINE,
  studentId: STUDENT,
  studentName: 'Diego',
  routineType: 'FUERZA',
  origin: 'GENERADA',
  targetWeeklyFrequency: 3,
  requestedAt: '2026-10-01T10:00:00.000Z',
  requestedByName: 'Diego',
  requestedByStudent: true,
  versionId: VERSION,
  versionNumber: 1,
  dayCount: 1,
  exerciseCount: 1,
  currentGoal: 'HIPERTROFIA',
  replacesActiveRoutine: true,
  goalMismatch: true,
};

describe('RoutineReviewPage (HU17)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra la rutina con su contexto y anticipa la confirmación de objetivo', async () => {
    mockApi({
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: { body: CONTENIDO },
      'GET /trainers/me/routine-reviews': { body: [PENDIENTE] },
    });
    renderRoute(PATH, URL, <RoutineReviewPage />);

    expect(
      await screen.findByText('Sentadilla', { exact: false }),
    ).toBeVisible();
    expect(await screen.findByRole('heading', { name: 'Diego' })).toBeVisible();
    expect(screen.getByText(/Tres días, foco en piernas/)).toBeVisible();
    expect(screen.getByText(/la anterior se archiva/)).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Aprobar y poner en vigencia' }),
    ).toBeDisabled();
  });

  it('rechaza con motivo y confirma la decisión', async () => {
    const fetchMock = mockApi({
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: { body: CONTENIDO },
      'GET /trainers/me/routine-reviews': { body: [PENDIENTE] },
      [`POST /students/${STUDENT}/routines/${ROUTINE}/review`]: {
        body: {
          routineId: ROUTINE,
          state: 'RECHAZADA',
          archivedRoutineId: null,
        },
      },
    });
    renderRoute(PATH, URL, <RoutineReviewPage />);

    fireEvent.change(
      await screen.findByLabelText('Observación para el alumno'),
      { target: { value: 'Mucho volumen para empezar' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));

    expect(await screen.findByText('Rutina rechazada')).toBeVisible();
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        ([, init]) => init?.method === 'POST',
      );
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({
        result: 'RECHAZADA',
        observation: 'Mucho volumen para empezar',
      });
    });
    expect(
      screen.getByRole('link', { name: 'Volver a la bandeja' }),
    ).toHaveAttribute('href', '/entrenador/rutinas/revisar');
  });

  it('si otra pestaña ya la resolvió, lo explica', async () => {
    mockApi({
      [`GET /students/${STUDENT}/routines/${ROUTINE}`]: { body: CONTENIDO },
      'GET /trainers/me/routine-reviews': {
        body: [{ ...PENDIENTE, goalMismatch: false }],
      },
      [`POST /students/${STUDENT}/routines/${ROUTINE}/review`]: {
        status: 409,
        body: { error: 'routine_not_reviewable' },
      },
    });
    renderRoute(PATH, URL, <RoutineReviewPage />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Aprobar y poner en vigencia',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ya fue resuelta',
    );
  });
});
