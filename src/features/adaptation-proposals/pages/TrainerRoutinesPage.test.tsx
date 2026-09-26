import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { TrainerRoutinesPage } from './TrainerRoutinesPage';

const STUDENT = '11111111-1111-4111-a111-111111111111';

describe('TrainerRoutinesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lista por separado una rutina propuesta y advierte si faltan mediciones', async () => {
    mockApi({
      'GET /trainers/me/students': {
        body: [
          {
            studentId: STUDENT,
            displayName: 'Alumno sin mediciones',
            bloqueado: false,
            motivoBloqueo: null,
            fechaUltimaMedicion: null,
            faltasConsecutivas: 0,
            alturaCm: 175,
            objetivo: 'HIPERTROFIA',
            rutinaVigente: null,
            rutinasPendientesRevision: 1,
            propuestasAdaptacionPendientes: 0,
          },
        ],
      },
      'GET /trainers/me/proposals': { body: [] },
    });

    renderRoute(
      '/entrenador/rutinas/revisar',
      '/entrenador/rutinas/revisar',
      <TrainerRoutinesPage />,
    );

    expect(await screen.findByText('Alumno sin mediciones')).toBeVisible();
    expect(
      screen.getByText('Una rutina propuesta espera aprobación'),
    ).toBeVisible();
    expect(screen.getByText('Sin mediciones registradas')).toBeVisible();
    expect(
      screen.getByText(
        'No hay propuestas de adaptación esperando tu revisión.',
      ),
    ).toBeVisible();
  });
});
