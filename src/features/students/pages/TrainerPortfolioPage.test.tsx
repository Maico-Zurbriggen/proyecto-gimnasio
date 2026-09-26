import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { TrainerPortfolioPage } from './TrainerPortfolioPage';

const STUDENT = '11111111-1111-4111-a111-111111111111';

describe('TrainerPortfolioPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('suma rutinas propuestas y propuestas de adaptación pendientes', async () => {
    mockApi({
      'GET /trainers/me/students': {
        body: [
          {
            studentId: STUDENT,
            displayName: 'Alumno con revisiones',
            bloqueado: false,
            motivoBloqueo: null,
            fechaUltimaMedicion: null,
            faltasConsecutivas: 0,
            alturaCm: 175,
            objetivo: 'FUERZA',
            rutinaVigente: null,
            rutinasPendientesRevision: 1,
            propuestasAdaptacionPendientes: 2,
          },
        ],
      },
    });

    renderRoute('/entrenador', '/entrenador', <TrainerPortfolioPage />);

    expect(await screen.findByText('3 revisiones pendientes')).toBeVisible();
    const label = screen.getByText('Revisiones pendientes');
    expect(label.parentElement?.parentElement).toHaveTextContent(
      'Revisiones pendientes3esperan tu revisión',
    );
    expect(
      screen.getByText('3 revisiones pendientes necesitan tu atención.'),
    ).toBeVisible();
    expect(screen.getByText('Sin mediciones')).toBeVisible();
  });
});
