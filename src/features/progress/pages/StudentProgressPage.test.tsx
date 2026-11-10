import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '../../../../test/apiMocks';
import { StudentProgressPage } from './StudentProgressPage';

const STUDENT_ID = '11111111-1111-4111-a111-111111111111';
const SESSION_ID = '22222222-2222-4222-a222-222222222222';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudentProgressPage studentId={STUDENT_ID} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StudentProgressPage (HU34 - T1, T2, T3)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra adherencia, cumplimiento y volumen por grupo muscular cuando hay datos completos', async () => {
    mockApi({
      [`GET /students/${STUDENT_ID}/indicators/adherence`]: {
        body: {
          studentId: STUDENT_ID,
          adherencia: {
            disponible: true,
            porcentaje: 75,
            sesionesCompletadas: 3,
            sesionesEsperadas: 4,
          },
          calculadoEl: '2026-11-09T12:00:00Z',
        },
      },
      [`GET /students/${STUDENT_ID}/training-sessions`]: {
        body: {
          items: [
            {
              id: SESSION_ID,
              studentId: STUDENT_ID,
              routineDayName: 'Día de Torso',
              routineDayPosition: 1,
              state: 'COMPLETADA',
              simulated: false,
              startedAt: '2026-11-08T10:00:00Z',
              completedAt: '2026-11-08T11:00:00Z',
              occurredOn: '2026-11-08',
              totalSeries: 4,
              completedSeries: 4,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 1,
        },
      },
      [`GET /students/${STUDENT_ID}/sessions/${SESSION_ID}/compliance`]: {
        body: {
          sessionId: SESSION_ID,
          cumplimientoDeSeries: {
            disponible: true,
            porcentaje: 100,
            numerador: 4,
            denominador: 4,
          },
          cumplimientoDeRepeticiones: {
            disponible: true,
            porcentaje: 90,
            numerador: 36,
            denominador: 40,
          },
          calculadoEl: '2026-11-09T12:00:00Z',
        },
      },
      [`GET /students/${STUDENT_ID}/indicators/muscle-activity`]: {
        body: {
          studentId: STUDENT_ID,
          from: '2026-10-12',
          to: '2026-11-09',
          timezone: 'America/Argentina/Buenos_Aires',
          sessionCount: 6,
          insufficientData: null,
          unclassifiedSets: 0,
          unit: 'SERIES_EFECTIVAS',
          groups: [
            {
              group: 'PECTORAL',
              status: 'CALCULADO',
              volume: 16,
              frequency: 4,
            },
            {
              group: 'DORSAL',
              status: 'CALCULADO',
              volume: 12.5,
              frequency: 3,
            },
          ],
          exerciseVolumes: [],
          calculatedAt: '2026-11-09T12:00:00Z',
        },
      },
      'GET /catalog/taxonomies': {
        body: {
          muscles: [
            { code: 'PECTORAL', name: 'Pectoral' },
            { code: 'DORSAL', name: 'Dorsal' },
          ],
          equipment: [],
          movementPatterns: [],
          joints: [],
        },
      },
    });

    renderPage();

    // Adherencia (T1)
    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText(/Completaste/i)).toHaveTextContent('3');
      expect(screen.getByText(/Completaste/i)).toHaveTextContent('4');
    });

    // Cumplimiento (T1)
    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText(/Día de Torso/)).toBeInTheDocument();
    });

    // Volumen y frecuencia por grupo muscular (T2)
    expect(
      screen.getByText(/Volumen y frecuencia por grupo muscular/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Pectoral')).toBeInTheDocument();
    expect(screen.getByText(/16 series ef\./i)).toBeInTheDocument();
    expect(screen.getByText(/4 sesiones/i)).toBeInTheDocument();
    expect(screen.getByText('Dorsal')).toBeInTheDocument();
    expect(screen.getByText(/12.5 series ef\./i)).toBeInTheDocument();
  });

  it('T3: muestra InsufficientInfo cuando falta historial y no dibuja gráficos vacíos ni ceros engañosos', async () => {
    mockApi({
      [`GET /students/${STUDENT_ID}/indicators/adherence`]: {
        body: {
          studentId: STUDENT_ID,
          adherencia: {
            disponible: false,
            status: 'SIN_DATOS_SUFICIENTES',
            missing: 'historial de rutina vigente',
            unit: 'semanas',
            required: 2,
            available: 0,
            remaining: 2,
            action: 'Esperá a completar al menos dos semanas.',
          },
          calculadoEl: '2026-11-09T12:00:00Z',
        },
      },
      [`GET /students/${STUDENT_ID}/training-sessions`]: {
        body: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 1,
        },
      },
      [`GET /students/${STUDENT_ID}/indicators/muscle-activity`]: {
        body: {
          studentId: STUDENT_ID,
          from: '2026-10-12',
          to: '2026-11-09',
          timezone: 'America/Argentina/Buenos_Aires',
          sessionCount: 0,
          insufficientData: {
            status: 'SIN_DATOS_SUFICIENTES',
            missing: 'sesiones completadas en el período',
            unit: 'sesiones',
            required: 1,
            available: 0,
            remaining: 1,
            action: 'Elegí otro período o registrá una sesión completada.',
          },
          unclassifiedSets: 0,
          unit: 'SERIES_EFECTIVAS',
          groups: [],
          exerciseVolumes: [],
          calculatedAt: '2026-11-09T12:00:00Z',
        },
      },
      'GET /catalog/taxonomies': {
        body: {
          muscles: [],
          equipment: [],
          movementPatterns: [],
          joints: [],
        },
      },
    });

    renderPage();

    await waitFor(() => {
      // Debe aparecer InsufficientInfo en adherencia
      expect(
        screen.getByText(
          /Hacen falta 2 semanas \(historial de rutina vigente\)/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Esperá a completar al menos dos semanas\./i),
      ).toBeInTheDocument();
    });

    // Debe aparecer InsufficientInfo en cumplimiento de sesión
    expect(
      screen.getByText(/sesión de entrenamiento completada/i),
    ).toBeInTheDocument();

    // Debe aparecer InsufficientInfo en volumen por grupo muscular
    expect(
      screen.getByText(
        /Hacen falta 1 sesiones \(sesiones completadas en el período\)/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Elegí otro período o registrá una sesión completada\./i,
      ),
    ).toBeInTheDocument();

    // No debe haber porcentajes engañosos en el documento
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('permite cambiar el período en el selector de semanas para consultar más historial', async () => {
    mockApi({
      [`GET /students/${STUDENT_ID}/indicators/adherence`]: {
        body: {
          studentId: STUDENT_ID,
          adherencia: {
            disponible: true,
            porcentaje: 100,
            sesionesCompletadas: 4,
            sesionesEsperadas: 4,
          },
          calculadoEl: '2026-11-09T12:00:00Z',
        },
      },
      [`GET /students/${STUDENT_ID}/training-sessions`]: {
        body: { items: [], total: 0, page: 1, pageSize: 1 },
      },
      [`GET /students/${STUDENT_ID}/indicators/muscle-activity`]: () => {
        return {
          body: {
            studentId: STUDENT_ID,
            from: '2026-10-12',
            to: '2026-11-09',
            timezone: 'America/Argentina/Buenos_Aires',
            sessionCount: 2,
            insufficientData: null,
            unclassifiedSets: 0,
            unit: 'SERIES_EFECTIVAS',
            groups: [
              { group: 'BICEPS', status: 'CALCULADO', volume: 8, frequency: 2 },
            ],
            exerciseVolumes: [],
            calculatedAt: '2026-11-09T12:00:00Z',
          },
        };
      },
      'GET /catalog/taxonomies': {
        body: {
          muscles: [{ code: 'BICEPS', name: 'Bíceps' }],
          equipment: [],
          movementPatterns: [],
          joints: [],
        },
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText(/biceps/i).length).toBeGreaterThan(0);
    });

    const eightWeeksButton = screen.getByRole('button', { name: /8 semanas/i });
    fireEvent.click(eightWeeksButton);

    expect(eightWeeksButton).toHaveClass('bg-white');
  });
});
