import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '../../../../test/apiMocks';
import { TrainerSignalsCard } from './TrainerSignalsCard';

const STUDENT_ID = '11111111-1111-4111-a111-111111111111';

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TrainerSignalsCard studentId={STUDENT_ID} />
    </QueryClientProvider>,
  );
}

describe('TrainerSignalsCard (HU35 - T1)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra las alertas cuando se detecta estancamiento, caída de adherencia o desbalance', async () => {
    mockApi({
      [`GET /students/${STUDENT_ID}/indicators/signals`]: {
        body: {
          studentId: STUDENT_ID,
          estancamiento: [
            {
              sobre: 'Press de banca',
              estado: 'DETECTADA',
              detalle: {
                exerciseId: 'ex-press',
                variacionPorcentual: 0,
                sesionesConsideradas: 4,
              },
            },
          ],
          caidaDeAdherencia: {
            estado: 'DETECTADA',
            detalle: {
              adherenciaPrevia: 100,
              adherenciaReciente: 50,
              caidaEnPuntos: 50,
            },
          },
          desbalance: {
            estado: 'DETECTADA',
            detalle: [
              {
                grupo: 'PECTORAL',
                seriesSemanales: 2,
                tipo: 'POR_DEFECTO',
              },
            ],
          },
          seriesSinClasificar: 3,
          calculadoEl: '2026-11-09T12:00:00Z',
        },
      },
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByText('Requiere atención')).toBeInTheDocument();
    });

    // Estancamiento detectado
    expect(screen.getByText('Press de banca')).toBeInTheDocument();
    expect(
      screen.getByText(/Variación: 0% en 4 sesiones consideradas/i),
    ).toBeInTheDocument();

    // Caída de adherencia
    expect(screen.getByText(/Caída de 50 puntos/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Pasó del 100% previo al 50% reciente/i),
    ).toBeInTheDocument();

    // Desbalance muscular
    expect(screen.getByText(/Pectoral/i)).toBeInTheDocument();
    expect(
      screen.getByText(/2 series\/sem \(por defecto, mín\. 6\)/i),
    ).toBeInTheDocument();

    // Series sin clasificar
    expect(screen.getByText(/El alumno ejecutó/i)).toBeInTheDocument();
    expect(
      screen.getByText(/sin clasificación muscular asignada/i),
    ).toBeInTheDocument();
  });

  it('muestra estado verde cuando no hay señales detectadas', async () => {
    mockApi({
      [`GET /students/${STUDENT_ID}/indicators/signals`]: {
        body: {
          studentId: STUDENT_ID,
          estancamiento: [
            {
              sobre: 'Sentadilla',
              estado: 'SIN_SENAL',
            },
          ],
          caidaDeAdherencia: {
            estado: 'SIN_SENAL',
          },
          desbalance: {
            estado: 'SIN_SENAL',
          },
          seriesSinClasificar: 0,
          calculadoEl: '2026-11-09T12:00:00Z',
        },
      },
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByText('Sin señales críticas')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Sentadilla: progresión normal/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Adherencia estable sin caídas significativas/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Volumen muscular equilibrado/i),
    ).toBeInTheDocument();
  });

  it('informa datos insuficientes con InsufficientInfo sin mostrar falsas alertas', async () => {
    mockApi({
      [`GET /students/${STUDENT_ID}/indicators/signals`]: {
        body: {
          studentId: STUDENT_ID,
          estancamiento: [
            {
              sobre: 'Press militar',
              estado: 'DATOS_INSUFICIENTES',
              status: 'SIN_DATOS_SUFICIENTES',
              missing: 'sesiones del ejercicio',
              unit: 'sesiones',
              required: 4,
              available: 1,
              remaining: 3,
              action: 'Registrá más sesiones.',
            },
          ],
          caidaDeAdherencia: {
            estado: 'DATOS_INSUFICIENTES',
            status: 'SIN_DATOS_SUFICIENTES',
            missing: 'frecuencia objetivo vigente',
            unit: 'semanas',
            required: 4,
            available: 0,
            remaining: 4,
            action: 'Asigná una rutina con frecuencia.',
          },
          desbalance: {
            estado: 'DATOS_INSUFICIENTES',
            status: 'SIN_DATOS_SUFICIENTES',
            missing: 'clasificación muscular',
            action: 'Clasificá los ejercicios.',
          },
          seriesSinClasificar: 0,
          calculadoEl: '2026-11-09T12:00:00Z',
        },
      },
    });

    renderCard();

    await waitFor(() => {
      expect(
        screen.getByText(/Hacen falta 4 sesiones \(sesiones del ejercicio\)/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Hacen falta 4 semanas \(frecuencia objetivo vigente\)/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Falta información: clasificación muscular/i),
      ).toBeInTheDocument();
    });
  });
});
