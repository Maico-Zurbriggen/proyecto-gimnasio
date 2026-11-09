import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { TrainerRoutinesPage } from './TrainerRoutinesPage';

const STUDENT = '11111111-1111-4111-a111-111111111111';

describe('TrainerRoutinesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('HU17: lista la bandeja de rutinas propuestas y advierte si faltan mediciones', async () => {
    mockApi({
      'GET /trainers/me/students': {
        body: [
          {
            studentId: STUDENT,
            displayName: 'Alumno sin mediciones',
            bloqueado: false,
            measurementBlockState: 'NORMAL',
            motivoBloqueo: null,
            fechaUltimaMedicion: null,
            faltasConsecutivas: 0,
            blockedAt: null,
            submittedAt: null,
            alturaCm: 175,
            objetivo: 'HIPERTROFIA',
            rutinaVigente: null,
            rutinasPendientesRevision: 1,
            propuestasAdaptacionPendientes: 0,
          },
        ],
      },
      'GET /trainers/me/proposals': { body: [] },
      'GET /trainers/me/routine-reviews': {
        body: [
          {
            routineId: '22222222-2222-4222-a222-222222222222',
            studentId: STUDENT,
            studentName: 'Alumno sin mediciones',
            routineType: 'FUERZA',
            origin: 'GENERADA',
            targetWeeklyFrequency: 3,
            requestedAt: '2026-10-01T10:00:00.000Z',
            requestedByName: 'Alumno sin mediciones',
            requestedByStudent: true,
            versionId: '33333333-3333-4333-a333-333333333333',
            versionNumber: 1,
            dayCount: 3,
            exerciseCount: 9,
            currentGoal: 'HIPERTROFIA',
            replacesActiveRoutine: false,
            goalMismatch: true,
          },
        ],
      },
    });

    renderRoute(
      '/entrenador/rutinas/revisar',
      '/entrenador/rutinas/revisar',
      <TrainerRoutinesPage />,
    );

    expect(await screen.findByText('Alumno sin mediciones')).toBeVisible();
    expect(screen.getByText(/Generada a pedido del alumno/)).toBeVisible();
    expect(screen.getByText(/No coincide con el objetivo/)).toBeVisible();
    expect(await screen.findByText('Sin mediciones registradas')).toBeVisible();
    expect(screen.getByRole('link', { name: /Revisar/ })).toHaveAttribute(
      'href',
      `/entrenador/rutinas/propuestas/${STUDENT}/22222222-2222-4222-a222-222222222222`,
    );
    expect(
      screen.getByText(
        'No hay propuestas de adaptación esperando tu revisión.',
      ),
    ).toBeVisible();
  });

  it('T2: la bandeja de adaptaciones muestra criterio y dato sin abrir el detalle', async () => {
    mockApi({
      'GET /trainers/me/students': { body: [] },
      'GET /trainers/me/proposals': {
        body: [
          {
            id: '66000000-0000-4000-8000-000000000005',
            createdAt: '2026-09-14T12:00:00.000Z',
            student: { id: STUDENT, displayName: 'Sofía Medina' },
            globalSituation: 'ESTANCAMIENTO',
            adjustmentsCount: 1,
            adjustments: [
              {
                id: '67000000-0000-4000-8000-000000000051',
                type: 'CARGA',
                routineExerciseId: 're-1',
                exerciseName: 'Sentadilla con barra',
                criterion: 'Estancamiento: variación +0,8% < +2,5% (RN-79a).',
                previousValue: { carga_sugerida: 60 },
                proposedValue: { carga_sugerida: 62.5 },
                supportingData: { sesionesConsideradas: 6 },
                state: 'PENDIENTE',
              },
            ],
            advertenciaDatos: {
              sinDatosActualizados: false,
              faltasConsecutivas: 0,
              alcanzoTopeDeFaltas: false,
            },
          },
        ],
      },
      'GET /trainers/me/routine-reviews': { body: [] },
    });

    renderRoute(
      '/entrenador/rutinas/revisar',
      '/entrenador/rutinas/revisar',
      <TrainerRoutinesPage />,
    );

    expect(await screen.findByText('Sofía Medina')).toBeVisible();
    expect(screen.getByText(/Estancamiento: variación/)).toBeVisible();
  });
});
